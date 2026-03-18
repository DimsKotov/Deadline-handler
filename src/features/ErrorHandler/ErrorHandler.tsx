import styles from './ErrorHandler.module.css';

interface LoaderProps {
  text?: string;
}

const ErrorHandler: React.FC<LoaderProps> = ({ text = 'Ошибка' }) => (
  <div className={styles.erroWrapper}>
    <p className={styles.errorTitle}>{text}</p>
  </div>
);

export default ErrorHandler;
