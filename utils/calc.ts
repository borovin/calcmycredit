import {
  isBefore,
  isAfter,
  getDay,
  add,
  differenceInDays,
  getDaysInYear,
} from 'date-fns';

enum EarlyRepaymentType {
  // уменьшение срока кредита
  REDUCTION_LOAN_TERM,
  // уменьшение размера платежа
  REDUCTION_AMOUNT_PAYMENT,
}

enum EarlyRepaymentPaymentType {
  //точный платеж в месяц (обязательный + дополнительный)
  COMBINATION_FULL_PAYMENT,
  // дополнительный месячный платеж
  EARLY_REPAYMENT,
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

export function newPeriodicEarlyRepayment(input: Object): PeriodicEarlyRepayment {
  if (input.payment !== undefined) {
    return new PeriodicEarlyRepayment(input.type, input.paymentType, input.payment, input.start, input.end);
  }

  return undefined;
}

enum PaymentType {
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

function internalRound(val: number, s: number): number {
  const realScale = 10 ** s;
  return Math.round(val * realScale) / realScale;
}

function calcAnnuityPayment(percent: number, monthsCount: number, creditBody: number): number {
  const percentMonth = internalRound(percent / (12 * 100), 10);
  const temp = (1 + percentMonth) ** monthsCount;

  return internalRound((creditBody * percentMonth * temp) / (temp - 1), 10);
}

function calcDifferentiatedBodyPayment(percent: number, monthsCount: number, creditBody: number): number {
  return internalRound(creditBody / (monthsCount), 10);
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

function getPercentValueOfPayment(prevPaymentDate: Date, paymentDate: Date, creditBody: number, percent: number): number {
  const multiplier = internalRound((creditBody * percent) / 100, 10);
  if (paymentDate.getFullYear() === prevPaymentDate.getFullYear()) {
    return multiplier * internalRound(differenceInDays(paymentDate, prevPaymentDate) / getDaysInYear(prevPaymentDate), 10);
  }
  /*
        Проц = ОД x Ставка x (1 янв 2012 - 22 дек 2011) / (100 * 365) + ОД x Ставка x (22 янв 2012 - 1 янв 2012) / (100 * 366)
         */

  const firstDateOfYear = new Date(paymentDate.getFullYear(), 0, 1);
  return multiplier * (
    internalRound(differenceInDays(firstDateOfYear, prevPaymentDate) / getDaysInYear(prevPaymentDate), 10)
    + internalRound(differenceInDays(paymentDate, firstDateOfYear) / getDaysInYear(prevPaymentDate), 10)
  );
}

function filterEarlyRepayment(
  earlyRepayments: Array<EarlyRepayment>,
  prevPaymentDate: Date,
  paymentDate: Date,
): OnceEarlyRepayment {
  let payment = 0;
  let resPaymentType = null;
  let resType = null;
  for (const earlyRepayment of earlyRepayments) {
    if (!earlyRepayment.isIncludePaymentDate(prevPaymentDate, paymentDate)) {
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

  if (internalRound(payment, 0) === 0) {
    return null;
  }

  return new OnceEarlyRepayment(resType, resPaymentType, payment, paymentDate);
}

class CreditInput {
  dateOfContract: Date;
  dateFirstPayment: Date;
  months: number;
  credit: number;
  percent: number;
  paymentType: PaymentType;
}

class CalculationResult {
  payments: Array<PaymentInfo>;
  overpayment: number;
  finalNumberMonths: number;

  constructor() {
    this.finalNumberMonths = 0;
    this.overpayment = 0;
    this.payments = new Array<PaymentInfo>();
  }
}

class YearResult {
  year: number;
  types: Array<TypeCalculation>;
}

class TypeCalculation {
  overpayment: number;
  months: number;
  paymentType: PaymentType;
  firstPayment: number;
  earlyRepaymentType: EarlyRepaymentType;
}

export function calculate(
  dateOfContract: Date,
  dateFirstPayment: Date,
  credit: number,
  percent: number,
  payment: number
): Array<YearResult> {
  let result = new Array<YearResult>();
  let earlyRepaymentsReductionAmountPayment = new Array<EarlyRepayment>();
  let earlyRepaymentsReductionLoanTerm = new Array<EarlyRepayment>();
  if (payment !== undefined) {
    earlyRepaymentsReductionAmountPayment.push(
      new PeriodicEarlyRepayment(EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT, EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT, payment, dateFirstPayment, null)
    );
    earlyRepaymentsReductionLoanTerm.push(
      new PeriodicEarlyRepayment(EarlyRepaymentType.REDUCTION_LOAN_TERM, EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT, payment, dateFirstPayment, null)
    );
  }
  for (let i = 1; i <= 30; i++) {
    let yr = new YearResult();
    yr.year = i;
    result.push(yr);
    yr.types = new Array<TypeCalculation>();

    if (earlyRepaymentsReductionAmountPayment.length > 0) {
      yr.types.push(process(PaymentType.ANNUITY, EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT, processWithMonths({
        credit,
        dateFirstPayment,
        dateOfContract,
        months: i * 12,
        percent,
        paymentType: PaymentType.ANNUITY
      }, earlyRepaymentsReductionAmountPayment)));
      yr.types.push(process(PaymentType.DIFFERENTIATED, EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT, processWithMonths({
        credit,
        dateFirstPayment,
        dateOfContract,
        months: i * 12,
        percent,
        paymentType: PaymentType.DIFFERENTIATED
      }, earlyRepaymentsReductionAmountPayment)));
    }
    if (earlyRepaymentsReductionLoanTerm.length > 0) {
      yr.types.push(process(PaymentType.ANNUITY, EarlyRepaymentType.REDUCTION_LOAN_TERM, processWithMonths({
        credit,
        dateFirstPayment,
        dateOfContract,
        months: i * 12,
        percent,
        paymentType: PaymentType.ANNUITY
      }, earlyRepaymentsReductionLoanTerm)));
      yr.types.push(process(PaymentType.DIFFERENTIATED, EarlyRepaymentType.REDUCTION_LOAN_TERM, processWithMonths({
        credit,
        dateFirstPayment,
        dateOfContract,
        months: i * 12,
        percent,
        paymentType: PaymentType.DIFFERENTIATED
      }, earlyRepaymentsReductionLoanTerm)));
    }
  }

  return result;
}

function process(paymentType: PaymentType, earlyRepaymentType: EarlyRepaymentType, input: CalculationResult): TypeCalculation {
  let result = new TypeCalculation();
  result.earlyRepaymentType = earlyRepaymentType;
  result.paymentType = paymentType;
  result.months = input.finalNumberMonths;
  result.overpayment = input.overpayment;
  if (input.payments) {
    result.firstPayment = input.payments[0].mandatoryPayment;
  }

  return result;
}

export function processWithMonths(
  input: CreditInput,
  earlyRepayments: Array<EarlyRepayment>
): CalculationResult {
  const result = new CalculationResult();

  let first = input.dateOfContract != null;
  let leastMonths = input.months;
  const monthForCalc = input.dateOfContract != null ? (input.months - 1) : input.months;

  let prevPaymentDate = input.dateOfContract != null ? input.dateOfContract : add(input.dateFirstPayment, { months: -1, });
  let paymentDate = input.dateFirstPayment;
  let creditBody = input.credit;

  let mandatoryPayment = null;
  let mandatoryBodyPayment = null;

  if (PaymentType.DIFFERENTIATED === input.paymentType) {
    mandatoryBodyPayment = calcDifferentiatedBodyPayment(input.percent, monthForCalc, creditBody);
  } else if (PaymentType.ANNUITY === input.paymentType) {
    mandatoryPayment = calcAnnuityPayment(input.percent, monthForCalc, creditBody);
  } else {
    throw new Error('Incorrect Payment Type');
  }

  while (true) {
    const percentValueOfPayment = getPercentValueOfPayment(prevPaymentDate, paymentDate, creditBody, input.percent);
    if (PaymentType.ANNUITY === input.paymentType) {
      mandatoryBodyPayment = mandatoryPayment - percentValueOfPayment;
    } else if (PaymentType.DIFFERENTIATED === input.paymentType) {
      mandatoryPayment = mandatoryBodyPayment + percentValueOfPayment;
    }
    const paymentInfo = new PaymentInfo();
    result.payments.push(paymentInfo);
    paymentInfo.paymentDate = getNonWeekendDate(paymentDate);
    paymentInfo.creditBodyBeforePayment = creditBody;
    paymentInfo.mandatoryPaymentPercent = internalRound(percentValueOfPayment, 2);

    let filtered = null;
    if (first) {
      paymentInfo.creditBodyAfterPayment = internalRound(creditBody, 2);
      paymentInfo.mandatoryPayment = internalRound(percentValueOfPayment, 2);
      paymentInfo.mandatoryPaymentBody = 0;
    } else {
      if (mandatoryPayment > creditBody) {
        paymentInfo.mandatoryPayment = internalRound(creditBody + percentValueOfPayment, 2);
        paymentInfo.mandatoryPaymentBody = creditBody;
      } else {
        paymentInfo.mandatoryPayment = internalRound(mandatoryPayment, 2);
        paymentInfo.mandatoryPaymentBody = internalRound(mandatoryBodyPayment, 2);
      }

      creditBody = Math.max(creditBody - mandatoryPayment + percentValueOfPayment, 0);

      if (earlyRepayments.length > 0) {
        filtered = filterEarlyRepayment(earlyRepayments, prevPaymentDate, paymentDate);

        if (filtered != null) {
          if (EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT === filtered.getPaymentType()) {
            const leastReadyToPay = filtered.getPayment() - mandatoryPayment;
            if (leastReadyToPay >= creditBody) {
              paymentInfo.earlyRepayment = internalRound(creditBody, 2);
              creditBody = 0;
            } else {
              paymentInfo.earlyRepayment = internalRound(leastReadyToPay, 2);
              creditBody -= leastReadyToPay;
            }
          } else if (EarlyRepaymentPaymentType.EARLY_REPAYMENT === filtered.getPaymentType()) {
            if (filtered.getPayment() >= creditBody) {
              paymentInfo.earlyRepayment = internalRound(creditBody, 2);
              creditBody = 0;
            } else {
              paymentInfo.earlyRepayment = internalRound(filtered.getPayment(), 2);
              creditBody -= filtered.getPayment();
            }
          }
        }
      }

      paymentInfo.creditBodyAfterPayment = internalRound(creditBody, 2);
    }

    prevPaymentDate = paymentDate;
    paymentDate = add(paymentDate, { months: 1, });
    leastMonths -= 1;
    result.finalNumberMonths += 1;
    result.overpayment += paymentInfo.mandatoryPaymentPercent;

    if (internalRound(creditBody, 2) !== 0) {
      if (first) {
        first = false;
      } else if (filtered != null && EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT === filtered.getType()) {
        if (PaymentType.ANNUITY === input.paymentType) {
          mandatoryPayment = calcAnnuityPayment(input.percent, leastMonths, creditBody);
        } else if (PaymentType.DIFFERENTIATED === input.paymentType) {
          mandatoryBodyPayment = calcDifferentiatedBodyPayment(input.percent, leastMonths, creditBody);
        }
      }
    } else {
      break;
    }
  }

  result.overpayment = internalRound(result.overpayment, 2);
  return result;
}

function printReport(output: CalculationResult) {
  let totalPercentValue = 0;
  let total = 0;
  let months = 0;
  for (const p of output.payments) {
    //            System.out.println(MessageFormat.format(
    //                    "{0}\t{1}\t{2,number,#}\t{3,number,#}\t{4,number,#}\t{5,number,#}\t{6,number,#}\t{7,number,#}",
    //                    i + 1, p.getPaymentDate(), p.getCreditBodyBeforePayment(), p.getMandatoryPayment(), p.getMandatoryPaymentBody(), p.getMandatoryPaymentPercent(), p.getEarlyRepayment(), p.getCreditBodyAfterPayment())
    //            );
    total += p.mandatoryPaymentBody + p.earlyRepayment;
    totalPercentValue += p.mandatoryPaymentPercent;
    months += 1;
  }
  console.log(`Total percents:${internalRound(totalPercentValue, 2)}`);
  console.log(` Total body:${internalRound(total, 2)}`);
  console.log(` Total months:${months}`);
}

function main() {
  let payment = 100000;

  printReport(processWithMonths(
    {
      dateOfContract: new Date(2020, 1, 21),
      dateFirstPayment: new Date(2020, 2, 12),
      months: 240,
      percent: 7.49,
      credit: 4534128.44,
      paymentType: PaymentType.DIFFERENTIATED,
    },
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        payment,
        new Date(2020, 2, 12),
        null,
      ),
    ],
  ));

  printReport(processWithMonths(
    {
      dateOfContract: new Date(2020, 1, 21),
      dateFirstPayment: new Date(2020, 2, 12),
      months: 240,
      percent: 7.49,
      credit: 4534128.44,
      paymentType: PaymentType.DIFFERENTIATED,
    },
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_LOAN_TERM,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        payment,
        new Date(2020, 2, 12),
        null,
      ),
    ],
  ));
  printReport(processWithMonths(
    {
      dateOfContract: new Date(2020, 1, 21),
      dateFirstPayment: new Date(2020, 2, 12),
      months: 240,
      percent: 7.49,
      credit: 4534128.44,
      paymentType: PaymentType.ANNUITY,
    },
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_AMOUNT_PAYMENT,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        payment,
        new Date(2020, 2, 12),
        null,
      ),
    ],
  ));
  printReport(processWithMonths(
    {
      dateOfContract: new Date(2020, 1, 21),
      dateFirstPayment: new Date(2020, 2, 12),
      months: 240,
      percent: 7.49,
      credit: 4534128.44,
      paymentType: PaymentType.ANNUITY,
    },
    [
      new PeriodicEarlyRepayment(
        EarlyRepaymentType.REDUCTION_LOAN_TERM,
        EarlyRepaymentPaymentType.COMBINATION_FULL_PAYMENT,
        payment,
        new Date(2020, 2, 12),
        null,
      ),
    ],
  ));
}
