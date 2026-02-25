import styles from "./Header.module.css";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <img  className={styles.headerImg} src="/src/assets/images/icon-excel.png" alt="Excel Icon" />
        <span className={styles.title}>Обработчик сроков готовности</span>
      </div>
      <div className={styles.buttonWrapper}>
      <button className={styles.instructionButton}>Инструкция</button>
      </div>
    </header>
  );
};

export default Header;
