import React, { useRef, useState } from 'react';
import styles from './DeliveryData.module.css';
import * as XLSX from 'xlsx';

const DeliveryData: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null); // состояние для имени файла

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccess(null);
    setFileName(null); // сброс имени файла при обработке
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (typeof data === 'string' || data instanceof ArrayBuffer) {
        try {
          const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setError('Файл пустой или не содержит данных.');
            resetFileInput();
            return;
          }

          const columns = Object.keys(jsonData[0]).map(col => col.toLowerCase());

          const hasCS = columns.some(col => col.includes('цс'));
          const hasCode = columns.some(col => col.includes('код'));
          const hasArticle = columns.some(col => col.includes('артикул'));

          if (hasCS && hasCode && hasArticle) {
            setSuccess('Файл содержит необходимые столбцы.');
            setFileName(file.name); // сохраняем имя файла при успешной проверке
          } else {
            setError('Похоже данный файл не является "Данные о поставках".');
            resetFileInput();
          }
        } catch (err) {
          setError('Ошибка при чтении файла.');
          console.error(err);
          resetFileInput();
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileName(null); // сброс имени файла
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={styles.container}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className={styles.uploadBox} onClick={handleButtonClick}>
        <p className={styles.dataParagraf}>
          {fileName ? `Загружен файл: ${fileName}` : 'Перетащите или нажмите, чтобы выбрать файл "Данные о поставках"'}
        </p>
        <input
          type="file"
          accept=".xlsx, .xls"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
    </div>
  );
};

export default DeliveryData;