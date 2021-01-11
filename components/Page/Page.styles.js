import { makeStyles } from '@material-ui/core/styles';

export default makeStyles((theme) => ({
  main: {
    flexGrow: '1',
    padding: '40px 28px',
    overflowX: 'hidden',
    [theme.breakpoints.up('md')]: {
      padding: '40px 80px',
    },
  },
}), { name: 'Page' });
