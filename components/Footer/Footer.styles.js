import { makeStyles } from '@material-ui/core/styles';

export default makeStyles((theme) => ({
  navLinks: {
    textAlign: 'center',
    padding: '40px 80px',
    marginTop: '80px',
    borderTop: `1px solid ${theme.palette.divider}`,

    '& a': {
      margin: '0 20px',
    },
  },
}), { name: 'Page' });
