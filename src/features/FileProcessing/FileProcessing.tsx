import React, { useState, useEffect } from "react";
import styles from "./FileProcessing.module.css";

interface FileProcessingProps {
  deliveryDataReady: boolean;
  deliveryTimeReady: boolean;
}

const FileProcessing: React.FC<FileProcessingProps> = ({
  deliveryDataReady,
  deliveryTimeReady,
}) => {
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    if (deliveryDataReady && deliveryTimeReady) {
      setIsButtonDisabled(false);
    } else {
      setIsButtonDisabled(true);
    }
  }, [deliveryDataReady, deliveryTimeReady]);

  const handleClick = () => {
    alert("Выгрузка файла APEX начата!");
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.uploadButton}
        disabled={isButtonDisabled}
        onClick={handleClick}
      >
        Выгрузка файла APEX
      </button>
    </div>
  );
};

export default FileProcessing;
