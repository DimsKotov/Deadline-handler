import React from 'react';
import styles from './FileProcessing.module.css';

interface FileProcessingProps {
  isEnabled: boolean;
  onExport: () => void;
}

const FileProcessing: React.FC<FileProcessingProps> = ({ isEnabled, onExport }) => {
  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        disabled={!isEnabled}
        onClick={onExport}
      >
        Выгрузить файл APEX
      </button>
    </div>
  );
};

export default FileProcessing;