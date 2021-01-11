import { makeStyles } from '@material-ui/core/styles';

export default makeStyles(() => ({
  header: {
    backgroundColor: 'white',
  },

  main: {
    flexGrow: '1',
    padding: '40px 80px',
  },

  footer: {
    backgroundColor: 'red',
  },
}), { name: 'Page' });
