import {
  Link, Button, AppBar, Toolbar, IconButton,
} from '@material-ui/core';
import MenuIcon from 'mdi-material-ui/Menu';
import useHeaderStyles from './Header.styles';

const Header = (props) => {
  const classes = useHeaderStyles(props);

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton edge="start" className={classes.menuButton} aria-label="menu">
          <MenuIcon />
        </IconButton>
        <Link className={classes.logo} href="/" variant="h5">Start App</Link>
        <nav className={classes.navLinks}>
          <Link href="/contacts">Контакты</Link>
          <Link href="/about">О проекте</Link>
        </nav>
        <Button color="inherit">Login</Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
