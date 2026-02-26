import React, { useRef, useState } from 'react';
import styles from './DeliveryTime.module.css';
import { parseExcelFile, validateDeliveryTimeColumns } from '../../utils/ExcelUtils';

interface DeliveryTimeProps {
  onSuccess: (data: any[]) => void;
  onReset: () => void;
}

const DeliveryTime: React.FC<DeliveryTimeProps> = ({ onSuccess, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setFileName(null);
    
    try {
      const jsonData = await parseExcelFile(file);
      if (validateDeliveryTimeColumns(jsonData)) {
        setSuccess('Загружен корректный файл.');
        setFileName(file.name);
        onSuccess(jsonData);
      } else {
        setError('Похоже данный файл поставщика не содержит ключевые данные по артикулам или срокам.');
        resetFileInput();
        onReset();
      }
    } catch (err) {
      setError('Ошибка при чтении файла.');
      resetFileInput();
      onReset();
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileName(null);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={styles.timeContainer}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className={styles.timeUploadBox} onClick={handleButtonClick}>
        <p className={styles.timeParagraf}>
          {fileName
            ? `Загружен файл: ${fileName}`
            : 'Перетащите или нажмите, чтобы выбрать файл со сроками поставщика'}
        </p>
        <input
          type="file"
          accept=".xlsx, .xls"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {error && <p className={styles.timeError}>{error}</p>}
      {success && <p className={styles.timeSuccess}>{success}</p>}
    </div>
  );
};

export default DeliveryTime;