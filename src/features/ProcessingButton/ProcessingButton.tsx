import React from 'react';
import styles from './ProcessingButton.module.css';
import Loader from '../Loader/Loader';

interface ProcessingButtonProps {
  label: string;
  nsiLabel: string;
  onClick: () => void;
  disabled?: boolean;
  deliveryDataLoaded: boolean;
  deliveryTimeLoaded: boolean;
  showFileFormationOne: () => void;
  showFileFormationTwo: () => void;
  showFileFormationNSI: () => void;
  isProcessing?: boolean;
}

const ProcessingButton: React.FC<ProcessingButtonProps> = ({
  label,
  nsiLabel,
  onClick,
  disabled = false,
  deliveryDataLoaded,
  deliveryTimeLoaded,
  showFileFormationOne,
  showFileFormationTwo,
  showFileFormationNSI,
  isProcessing = false
}) => {
  // Кнопка APEX:
  // - если загружен только DeliveryTime -> сценарий одного файла,
  // - если загружены DeliveryTime + DeliveryData -> сценарий двух файлов,
  // - если данных нет -> оставляем дефолтное поведение onClick (валидация/подсказка).
  const handleClick = () => {
    if (deliveryTimeLoaded && !deliveryDataLoaded) {
      showFileFormationOne();
    } else if (deliveryTimeLoaded && deliveryDataLoaded) {
      showFileFormationTwo();
    } else {
      onClick();
    }
  };

  // Кнопка НСИ формируется только при наличии DeliveryTime.
  const handleNsiClick = () => {
    if (deliveryTimeLoaded) {
      showFileFormationNSI();
    } else {
      onClick();
    }
  };

  return (
    <div className={styles.container}>
      {/* Пока идёт формирование, скрываем кнопки и показываем лоадер. */}
      {isProcessing ? (
        <div className={styles.loaderContainer}>
          <Loader text="Формирую файл" />
        </div>
      ) : (
        // В обычном режиме показываем обе кнопки: APEX и НСИ.
        <div className={styles.buttonsRow}>
          <button
            className={styles.uploadButton}
            onClick={handleClick}
            disabled={disabled}
          >
            {label}
          </button>
          <button
            className={styles.uploadButton}
            onClick={handleNsiClick}
            disabled={disabled}
          >
            {nsiLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProcessingButton;
