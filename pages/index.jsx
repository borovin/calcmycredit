/* eslint-disable react/jsx-props-no-spreading */
import {
  Grid, TextField, Typography, Button, Divider, NoSsr,
} from '@material-ui/core';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
  add,
} from 'date-fns';
import Page from '../components/Page';
import pageStyles from '../components/Page/Page.module.css';
import _calc from '../utils/calc.ts';

const calc = ({ sum, rate, payment }) => {
  if (sum && rate && payment) {
    return {
      years: 10,
      months: 120,
      sum: 2000000,
      percent: 200,
      minPayment: 10000,
    };
  }
  return null;
};

const Results = (props) => {
  const {
    years,
    months,
    sum,
    percent,
    minPayment,
  } = props;

  const formattedSum = new Intl.NumberFormat('ru').format(sum);
  const formattedPercent = new Intl.NumberFormat('ru').format(percent);
  const formattedMinPayment = new Intl.NumberFormat('ru').format(minPayment);

  return (
    <>
      <Typography variant="h4">
        {months}
        {' '}
        месяцев (
        {years}
        {' '}
        лет)
      </Typography>
      <Typography variant="body2" style={{ paddingBottom: '40px' }}>
        Вам понадобится, чтобы закрыть кредит
      </Typography>
      <Typography variant="h4">
        {formattedSum}
        {' '}
        ₽ (
        {formattedPercent}
        %)
      </Typography>
      <Typography variant="body2" style={{ paddingBottom: '40px' }}>
        Вы переплатите банку
      </Typography>
      <Typography variant="h4">
        {formattedMinPayment}
        {' '}
        ₽ / в месяц
      </Typography>
      <Typography variant="body2" style={{ paddingBottom: '40px' }}>
        Составит минимальный обязательный платеж банку в случае форс-мажора
      </Typography>
      <Divider style={{ marginBottom: '32px' }} />
    </>
  );
};

const MainPage = () => {
  const { query, push } = useRouter();
  const [state, setState] = useState({
    sum: null,
    rate: null,
    payment: null,
    results: null,
  });

  useEffect(() => {
    const results = calc(query);
    setState(() => ({
      ...query,
      results,
    }));
  }, [query]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set('sum', state.sum);
    url.searchParams.set('rate', state.rate);
    url.searchParams.set('payment', state.payment);
    push(url.href);
  };

  return (
    <Page>
      <Grid container spacing={8}>
        <Grid item xs={12} md={4}>
          <form onSubmit={handleFormSubmit}>
            <div className={pageStyles.inputContainer}>
              <TextField
                onChange={handleInputChange}
                value={state.sum || ''}
                name="sum"
                fullWidth
                variant="outlined"
                label="Размер кредита"
                InputProps={{
                  endAdornment: '₽',
                }}
              />
            </div>
            <div className={pageStyles.inputContainer}>
              <TextField
                onChange={handleInputChange}
                value={state.rate || ''}
                name="rate"
                fullWidth
                variant="outlined"
                label="Процентная ставка"
                InputProps={{
                  endAdornment: '%',
                }}
              />
            </div>
            <div className={pageStyles.inputContainer}>
              <TextField
                onChange={handleInputChange}
                value={state.payment || ''}
                name="payment"
                fullWidth
                variant="outlined"
                label="Максимальный ежемесячный платеж"
                InputProps={{
                  endAdornment: '₽',
                }}
                helperText="TODO: объяснить что это такое"
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Button color="primary" size="large" type="submin">Рассчитать</Button>
            </div>
          </form>
        </Grid>
        <Grid item xs={12} md={8}>
          {state.results && <Results {...state.results} />}
          <Typography variant="h4">
            TODO
          </Typography>
          <Typography>
            рассказать про нашу стратегию, почему нужно уменьшить обязательный платеж
            и вносить максимально возможную сумму регулярно и досрочно
          </Typography>
          <NoSsr>
            <pre>
              {JSON.stringify(_calc(
                {
                  dateOfContract: new Date(2020, 1, 21),
                  dateFirstPayment: new Date(2020, 2, 12),
                  months: 240,
                  percent: 7.49,
                  credit: 4534128.44,
                  paymentType: 0,
                },
                [],
              ), null, 2)}
            </pre>
          </NoSsr>
        </Grid>
      </Grid>
    </Page>
  );
};

export default MainPage;
