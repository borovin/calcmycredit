// eslint-disable-next-line max-classes-per-file
import {
  isBefore,
  isAfter,
  getDay,
  add,
  differenceInDays,
  getDaysInYear,
} from 'date-fns';

// eslint-disable-next-line no-shadow,max-classes-per-file,no-unused-vars
enum EarlyRepaymentType {
  // eslint-disable-next-line no-unused-vars
  REDUCTION_LOAN_TERM, REDUCTION_AMOUNT_PAYMENT
}

// eslint-disable-next-line no-shadow,no-unused-vars
enum EarlyRepaymentPaymentType {
  // eslint-disable-next-line no-unused-vars
  COMBINATION_FULL_PAYMENT, EARLY_REPAYMENT
}

abstract class EarlyRepayment {
  public constructor(type: EarlyRepaymentType, paymentType: EarlyRepaymentPaymentType, payment: number) {
    this.type = type;
    this.paymentType = paymentType;
    this.payment = payment;

    if (this.payment === undefined) {
      this.payment = 0;
    }
  }

  type: EarlyRepaymentType;

  paymentType: EarlyRepaymentPaymentType;

  payment: number;

  // eslint-disable-next-line no-unused-vars
  public abstract isIncludePaymentDate(prevPaymentDate: Date, paymentDate: Date): boolean;

  public getType(): EarlyRepaymentType {
    return this.type;
  }

  public getPayment(): number {
    return this.payment;
  }

  public getPaymentType(): EarlyRepaymentPaymentType {
    return this.paymentType;
  }
}

class OnceEarlyRepayment extends EarlyRepayment {
  date: Date;

  public constructor(type: EarlyRepaymentType, paymentType: EarlyRepaymentPaymentType, payment: number, date: Date) {
    super(type, paymentType, payment);
    this.date = date;
  }

  public isIncludePaymentDate(prevPaymentDate: Date, paymentDate: Date): boolean {
    return isAfter(this.date, prevPaymentDate) && !isAfter(this.date, paymentDate);
  }
}

// eslint-disable-next-line no-unused-vars
class PeriodicEarlyRepayment extends EarlyRepayment {
  start: Date;

  end: Date;

  public constructor(type: EarlyRepaymentType, paymentType: EarlyRepaymentPaymentType, payment: number, start: Date, end: Date) {
    super(type, paymentType, payment);
    this.start = start;
    this.end = end;
  }

  public isIncludePaymentDate(prevPaymentDate: Date, paymentDate: Date): boolean {
    return !isAfter(this.start, paymentDate) && (this.end === undefined || isBefore(prevPaymentDate, this.end));
  }
}

// eslint-disable-next-line no-shadow,no-unused-vars
enum PaymentType {
  // eslint-disable-next-line no-unused-vars
  ANNUITY, DIFFERENTIATED
}

class PaymentInfo {
  paymentDate?: Date;

  creditBodyBeforePayment?: number;

  mandatoryPayment?: number;

  mandatoryPaymentBody?: number;

  mandatoryPaymentPercent?: number;

  creditBodyAfterPayment?: number;

  earlyRepayment?: number;
}

function scale(val: number, s: number): number {
  const realScale = 10 ** s;
  return Math.round(val * realScale) / realScale;
}

function calcAnnuityPayment(percent: number, monthsCount: number, creditBody: number) {
  const percentMonth = scale(percent / (12 * 100), 10);
  const temp = (1 + percentMonth) ** monthsCount;

  return scale((creditBody * percentMonth * temp) / (temp - 1), 10);
}

// @ts-ignore
function calcDifferentiatedBodyPayment(percent: number, monthsCount: number, creditBody: number) {
  return scale(creditBody / (monthsCount), 10);
}

function plusDays(a: Date, i: number): Date {
  return add(a, {
    days: i,
  });
}

function getNonWeekendDate(date: Date): Date {
  if (getDay(date) === 6) {
    return plusDays(date, 2);
  }
  if (getDay(date) === 0) {
    return plusDays(date, 1);
  }
  return date;
}

function daysBetween(a: Date, b: Date): number {
  return differenceInDays(a, b);
}

function lengthOfYear(a: Date): number {
  return getDaysInYear(a);
}

function plusMonths(a: Date, i: number): Date {
  return add(a, {
    months: i,
  });
}

function minusMonths(a: Date, i: number): Date {
  return add(a, {
    months: -i,
  });
}

function getPercentValueOfPayment(prevPaymentDate: Date, paymentDate: Date, creditBody: number, percent: number) {
  const multiplier = scale((creditBody * percent) / 100, 10);
  if (paymentDate.getFullYear() === prevPaymentDate.getFullYear()) {
    return multiplier * scale(daysBetween(prevPaymentDate, paymentDate) / lengthOfYear(prevPaymentDate), 10);
  }
  /*
        Проц = ОД x Ставка x (1 янв 2012 - 22 дек 2011) / (100 * 365) + ОД x Ставка x (22 янв 2012 - 1 янв 2012) / (100 * 366)
         */

  const firstDateOfYear = new Date(paymentDate.getFullYear(), 0, 1);
  return multiplier * (
    scale(daysBetween(prevPaymentDate, firstDateOfYear) / lengthOfYear(prevPaymentDate), 10)
    + scale(daysBetween(firstDateOfYear, paymentDate) / lengthOfYear(prevPaymentDate), 10)
  );
}

function filterEarlyRepayment(
  earlyRepayments: Array<EarlyRepayment>,
  prevPaymentDate: Date,
  paymentDate: Date,
) {
  let payment = 0;
  let resPaymentType = null;
  let resType = null;
  // eslint-disable-next-line no-restricted-syntax
  for (const earlyRepayment of earlyRepayments) {
    if (!earlyRepayment.isIncludePaymentDate(prevPaymentDate, paymentDate)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT === earlyRepayment.getPaymentType()) {
      resPaymentType = EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT;
      resType = earlyRepayment.getType();
    } else if (resPaymentType == null) {
      resPaymentType = earlyRepayment.getPaymentType();
      resType = earlyRepayment.getType();
    }

    payment += earlyRepayment.getPayment();
  }

  if (scale(payment, 0) === 0) {
    return null;
  }

  // @ts-ignore
  return new OnceEarlyRepayment(resType, resPaymentType, payment, paymentDate);
}

export default function processWithMonths(
  dateOfContract: Date,
  dateFirstPayment: Date,
  months: number,
  credit: number,
  percent: number,
  paymentType: PaymentType,
  earlyRepayments: Array<EarlyRepayment>,
) {
  // eslint-disable-next-line no-array-constructor
  const result = new Array<PaymentInfo>();
  let first = dateOfContract != null;
  let leastMonths = months;
  const monthForCalc = dateOfContract != null ? (months - 1) : months;

  let prevPaymentDate = dateOfContract != null ? dateOfContract : minusMonths(dateFirstPayment, 1);
  let paymentDate = dateFirstPayment;
  let creditBody = credit;

  let mandatoryPayment = null;
  let mandatoryBodyPayment = null;

  if (PaymentType.DIFFERENTIATED === paymentType) {
    mandatoryBodyPayment = calcDifferentiatedBodyPayment(percent, monthForCalc, creditBody);
  } else if (PaymentType.ANNUITY === paymentType) {
    mandatoryPayment = calcAnnuityPayment(percent, monthForCalc, creditBody);
  } else {
    throw new Error('Incorrect Payment Type');
  }

  while (true) {
    const percentValueOfPayment = getPercentValueOfPayment(prevPaymentDate, paymentDate, creditBody, percent);
    if (PaymentType.ANNUITY === paymentType) {
      // @ts-ignore
      mandatoryBodyPayment = mandatoryPayment - percentValueOfPayment;
    } else if (PaymentType.DIFFERENTIATED === paymentType) {
      // @ts-ignore
      mandatoryPayment = mandatoryBodyPayment + percentValueOfPayment;
    }
    const paymentInfo = new PaymentInfo();
    result.push(paymentInfo);
    paymentInfo.paymentDate = getNonWeekendDate(paymentDate);
    paymentInfo.creditBodyBeforePayment = creditBody;
    paymentInfo.mandatoryPaymentPercent = percentValueOfPayment;

    let filtered = null;
    if (first) {
      paymentInfo.creditBodyAfterPayment = creditBody;
      paymentInfo.mandatoryPayment = percentValueOfPayment;
      paymentInfo.mandatoryPaymentBody = 0;
    } else {
      // @ts-ignore
      if (mandatoryPayment > creditBody) {
        paymentInfo.mandatoryPayment = creditBody + percentValueOfPayment;
        paymentInfo.mandatoryPaymentBody = creditBody;
      } else {
        // @ts-ignore
        paymentInfo.mandatoryPayment = mandatoryPayment;
        // @ts-ignore
        paymentInfo.mandatoryPaymentBody = mandatoryBodyPayment;
      }

      // @ts-ignore
      creditBody = Math.max(creditBody - mandatoryPayment + percentValueOfPayment, 0);

      if (earlyRepayments.length > 0) {
        filtered = filterEarlyRepayment(earlyRepayments, prevPaymentDate, paymentDate);

        if (filtered != null) {
          if (EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT === filtered.getPaymentType()) {
            // @ts-ignore
            const leastReadyToPay = filtered.getPayment() - mandatoryPayment;
            if (leastReadyToPay >= creditBody) {
              paymentInfo.earlyRepayment = creditBody;
              creditBody = 0;
            } else {
              paymentInfo.earlyRepayment = leastReadyToPay;
              creditBody -= leastReadyToPay;
            }
          } else if (EarlyRepaymentPaymentType.EARLY_REPAYMENT === filtered.getPaymentType()) {
            if (filtered.getPayment() >= creditBody) {
              paymentInfo.earlyRepayment = creditBody;
              creditBody = 0;
            } else {
              paymentInfo.earlyRepayment = filtered.getPayment();
              creditBody -= filtered.getPayment();
            }
          }
        }
      }

      paymentInfo.creditBodyAfterPayment = creditBody;
    }

    prevPaymentDate = paymentDate;
    paymentDate = plusMonths(paymentDate, 1);
    leastMonths -= 1;

    if (scale(creditBody, 2) === 0) {
      break;
    }

    if (first) {
      first = false;
      // eslint-disable-next-line max-len
    } else if (filtered != null && EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT === filtered.getType()) {
      if (PaymentType.ANNUITY === paymentType) {
        mandatoryPayment = calcAnnuityPayment(percent, leastMonths, creditBody);
      } else if (PaymentType.DIFFERENTIATED === paymentType) {
        mandatoryBodyPayment = calcDifferentiatedBodyPayment(percent, leastMonths, creditBody);
      }
    }
  }

  return result;
}

function printReport(payments: Array<PaymentInfo>) {
//        System.out.println("Порядковый номер\tДата платежа\tОстаток долга\tПлатеж обязательный\tПлатеж Обязательный тело\tПлатеж Обязательный проценты\tДосрочная часть\tОстаток долга на конец периода");
  let totalPercentValue = 0;
  let total = 0;
  let months = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const p of payments) {
    //            System.out.println(MessageFormat.format(
    //                    "{0}\t{1}\t{2,number,#}\t{3,number,#}\t{4,number,#}\t{5,number,#}\t{6,number,#}\t{7,number,#}",
    //                    i + 1, p.getPaymentDate(), p.getCreditBodyBeforePayment(), p.getMandatoryPayment(), p.getMandatoryPaymentBody(), p.getMandatoryPaymentPercent(), p.getEarlyRepayment(), p.getCreditBodyAfterPayment())
    //            );
    total += p.mandatoryPaymentBody + p.earlyRepayment;
    totalPercentValue += p.mandatoryPaymentPercent;
    months += 1;
  }
  console.log(`Total percents:${scale(totalPercentValue, 2)}`);
  console.log(` Total body:${scale(total, 2)}`);
  console.log(` Total months:${months}`);
}

// eslint-disable-next-line no-unused-vars
function main() {
  const val = 100000;
  const contract = new Date(2020, 1, 21);
  const startDate = new Date(2020, 2, 12);
  const months = 240;
  const credit = 4534128.44;
  const percent = 7.49;

  printReport(processWithMonths(
    contract,
    startDate,
    months,
    credit,
    percent,
    PaymentType.DIFFERENTIATED,
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        val,
        startDate,
        null,
      ),
    ],
  ));
  printReport(processWithMonths(
    contract,
    startDate,
    months,
    credit,
    percent,
    PaymentType.DIFFERENTIATED,
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_LOAN_TERM,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        val,
        startDate,
        null,
      ),
    ],
  ));
  printReport(processWithMonths(
    contract,
    startDate,
    months,
    credit,
    percent,
    PaymentType.ANNUITY,
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        val,
        startDate,
        null,
      ),
    ],
  ));
  printReport(processWithMonths(
    contract,
    startDate,
    months,
    credit,
    percent,
    PaymentType.ANNUITY,
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_LOAN_TERM,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        val,
        startDate,
        null,
      ),
    ],
  ));
}
