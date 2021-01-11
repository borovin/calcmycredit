import {
  Link, AppBar, Toolbar, IconButton,
} from '@material-ui/core';
import CalculatorVariantOutline from 'mdi-material-ui/CalculatorVariantOutline';
import useHeaderStyles from './Header.styles';

const Header = (props) => {
  const classes = useHeaderStyles(props);

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton edge="start" className={classes.menuButton} aria-label="menu">
          <CalculatorVariantOutline />
        </IconButton>
        <Link className={classes.logo} href="/" variant="h5">Кредитный калькулятор</Link>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
