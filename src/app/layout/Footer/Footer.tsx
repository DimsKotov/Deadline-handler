import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div>
        <h4 className={styles.footerTitle}>
          Разработал: Котов Дмитрий
        </h4>
      </div>
    </footer>
  );
};

export default Footer;
