import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text = 'Загружаю файл...' }) => (
  <div className={styles.loaderWrapper}>
    <span className={styles.loader}></span>
    <h2 className={styles.loaderTitle}>{text}</h2>
  </div>
);

export default Loader;
