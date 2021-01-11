import { Link } from '@material-ui/core';
import useFooterStyles from './Footer.styles';

const Footer = (props) => {
  const classes = useFooterStyles(props);

  return (
    <nav className={classes.navLinks}>
      <Link href="/about">О проекте</Link>
      <Link href="/contacts">Контакты</Link>
      <Link href="/licence">Пользовательское соглашение</Link>
    </nav>
  );
};

export default Footer;
