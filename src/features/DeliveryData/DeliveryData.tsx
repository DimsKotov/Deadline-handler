import React, { useRef, useState } from 'react';
import styles from './DeliveryData.module.css';
import { parseExcelFile, validateDeliveryDataColumns } from '../../utils/ExcelUtils';
import Loader from '../Loader/Loader'; // Добавляем импорт Loader

interface DeliveryDataProps {
  onSuccess: (data: any[]) => void;
  onReset: () => void;
}

const DeliveryData: React.FC<DeliveryDataProps> = ({ onSuccess, onReset }) => {
  // Компонент загрузки "Данные о поставках":
  // - принимает один Excel-файл,
  // - парсит и валидирует ключевые столбцы,
  // - сообщает родителю либо валидные данные, либо сброс состояния.
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
    // Перед новой загрузкой очищаем прошлые статусы.
    setError(null);
    setSuccess(null);
    setFileName(null);
    setIsLoading(true); // Начинаем загрузку

    try {
      // Парсим Excel в JSON и проверяем, что это действительно файл "Данные о поставках".
      const jsonData = await parseExcelFile(file);
      if (validateDeliveryDataColumns(jsonData)) {
        // Успех: сохраняем имя и поднимаем данные наверх.
        setSuccess('Загружен корректный файл.');
        setFileName(file.name);
        onSuccess(jsonData);
      } else {
        // Невалидный файл: показываем ошибку и очищаем состояние родителя.
        setError('Похоже данный файл не является "Данные о поставках".');
        resetFileInput();
        onReset();
      }
    } catch (err) {
      // Ошибка чтения/парсинга файла.
      setError('Ошибка при чтении файла.');
      resetFileInput();
      onReset();
    } finally {
      setIsLoading(false); // Завершаем загрузку в любом случае
    }
  };

  const resetFileInput = () => {
    // Полный сброс поля input и отображаемого имени файла.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileName(null);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Ручная очистка пользователем: сбрасываем локальные статусы и данные у родителя.
    e.stopPropagation();
    setError(null);
    setSuccess(null);
    resetFileInput();
    onReset();
  };

  return (
    <div
      className={styles.dataContainer}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className={styles.dataUploadBox} onClick={handleButtonClick}>
        {fileName && !isLoading && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Очистить загруженный файл"
          >
            ×
          </button>
        )}
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
        {isLoading && (
          <div className={styles.loaderOverlay}>
            <Loader />
          </div>
        )}
      </div>
      {error && <p className={styles.dataError}>{error}</p>}
      {success && <p className={styles.dataSuccess}>{success}</p>}
    </div>
  );
};

export default DeliveryData;
