import React from 'react';
import styles from './ProcessingButton.module.css';
import Loader from '../Loader/Loader';

interface ProcessingButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  deliveryDataLoaded: boolean;
  deliveryTimeLoaded: boolean;
  showFileFormationOne: () => void;
  showFileFormationTwo: () => void;
  isProcessing?: boolean;
}

const ProcessingButton: React.FC<ProcessingButtonProps> = ({
  label,
  onClick,
  disabled = false,
  deliveryDataLoaded,
  deliveryTimeLoaded,
  showFileFormationOne,
  showFileFormationTwo,
  isProcessing = false
}) => {
  const handleClick = () => {
    if (deliveryTimeLoaded && !deliveryDataLoaded) {
      showFileFormationOne();
    } else if (deliveryTimeLoaded && deliveryDataLoaded) {
      showFileFormationTwo();
    } else {
      onClick();
    }
  };

  return (
    <div className={styles.container}>
      {isProcessing ? (
        <div className={styles.loaderContainer}>
          <Loader text="Формирую файл APEX"/>          
        </div>
      ) : (
        <button
          className={styles.uploadButton}
          onClick={handleClick}
          disabled={disabled}
        >
          {label}
        </button>
      )}
    </div>
  );
};

export default ProcessingButton;
