import Header from '../Header';
import usePageStyles from './Page.styles';

const Page = (props) => {
  const { children } = props;
  const classes = usePageStyles(props);

  return (
    <>
      <Header />
      <main className={classes.main}>
        {children}
      </main>
      {/* <Footer /> */}
    </>
  );
};

export default Page;
