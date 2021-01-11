import { makeStyles } from '@material-ui/core/styles';

export default makeStyles(() => ({
  menuButton: {
    marginRight: '20px',
    color: 'inherit',
  },
  logo: {
    fontSize: '20px',
    textTransform: 'uppercase',
    paddingRight: '40px',
    textDecoration: 'none',
    color: 'inherit',
  },
  navLinks: {
    flexGrow: '1',
    textAlign: 'right',
    paddingRight: '40px',

    '& a': {
      margin: '0 20px',
      color: 'inherit',
    },
  },
}), { name: 'Header' });
