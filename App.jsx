/* eslint-disable react/jsx-props-no-spreading */
import Head from 'next/head';
import { useState, createContext, useContext } from 'react';
import ThemeProvider from './components/ThemeProvider';
import handleHrefClick from './utils/handleHrefClick';

const AppContext = createContext();
export const useAppState = () => useContext(AppContext);

const App = ({ Component, pageProps }) => {
  const appState = useState();

  return (
    <>
      <Head>
        <title>Кредитный калькулятор</title>
        <link rel="stylesheet" href="/main.css" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <ThemeProvider>
        <AppContext.Provider value={appState}>
          <Component {...pageProps} />
        </AppContext.Provider>
      </ThemeProvider>
    </>
  );
};

if (typeof document !== 'undefined') {
  document.addEventListener('click', function handleLinkClick(e) {
    for (let { target } = e; target && target !== this; target = target.parentNode) {
      if (target.hasAttribute('href')) {
        handleHrefClick(e, target);
        break;
      }
    }
  }, false);
}

export default App;
