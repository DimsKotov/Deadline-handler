import React, { useRef, useState } from 'react';
import styles from './DeliveryData.module.css';
import { parseExcelFile, validateDeliveryDataColumns } from '../../utils/ExcelUtils';
import Loader from '../Loader/Loader'; // Добавляем импорт Loader

interface DeliveryDataProps {
  onSuccess: (data: any[]) => void;
  onReset: () => void;
}

const DeliveryData: React.FC<DeliveryDataProps> = ({ onSuccess, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Добавляем состояние загрузки

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
    setIsLoading(true); // Начинаем загрузку

    try {
      const jsonData = await parseExcelFile(file);
      if (validateDeliveryDataColumns(jsonData)) {
        setSuccess('Загружен корректный файл.');
        setFileName(file.name);
        onSuccess(jsonData);
      } else {
        setError('Похоже данный файл не является "Данные о поставках".');
        resetFileInput();
        onReset();
      }
    } catch (err) {
      setError('Ошибка при чтении файла.');
      resetFileInput();
      onReset();
    } finally {
      setIsLoading(false); // Завершаем загрузку в любом случае
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
      className={styles.dataContainer}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {isLoading ? (
        <Loader /> // Показываем Loader во время загрузки
      ) : (
        <>
          <div className={styles.dataUploadBox} onClick={handleButtonClick}>
            <p className={styles.dataParagraf}>
              {fileName
                ? `Загружен файл: ${fileName}`
                : 'Перетащите или нажмите, чтобы выбрать файл "Данные о поставках"'}
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          {error && <p className={styles.dataError}>{error}</p>}
          {success && <p className={styles.dataSuccess}>{success}</p>}
        </>
      )}
    </div>
  );
};

export default DeliveryData;
