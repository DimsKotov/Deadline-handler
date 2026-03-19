import React, { useRef, useState } from 'react';
import styles from './DeliveryTime.module.css';
import { parseExcelFile, validateDeliveryTimeColumns } from '../../utils/ExcelUtils';
import Loader from '../Loader/Loader'; // Добавляем импорт Loader

interface DeliveryTimeProps {
  onSuccess: (
    data: any[],
    fileName: string,
    sources: Array<{ name: string; data: any[] }>,
  ) => void;
  onReset: () => void;
}

const DeliveryTime: React.FC<DeliveryTimeProps> = ({ onSuccess, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Добавляем состояние загрузки
  const [loadedFiles, setLoadedFiles] = useState<
    Array<{ name: string; data: any[] }>
  >([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const getPreferredSheetName = (fileName: string): string | undefined => {
    const lower = fileName.toLowerCase();
    if (lower.includes("betterman") || lower.includes("беттерман")) {
      return "Прайс-лист";
    }
    if (lower.includes("dkc maga del 1100") || lower.includes("dkc maga del 1200")) {
      return "Склад ДКС";
    }
    return undefined;
  };

  const processFiles = async (files: File[]) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true); // Начинаем загрузку

    try {
      // Берём только первые 2 файла из текущего действия
      const incomingFiles = files.slice(0, 2);

      // Если уже загружено 2 файла — начинаем заново с новых
      const baseLoaded = loadedFiles.length >= 2 ? [] : [...loadedFiles];

      for (const file of incomingFiles) {
        const preferredSheetName = getPreferredSheetName(file.name);
        const jsonData = await parseExcelFile(file, { preferredSheetName });
        if (!validateDeliveryTimeColumns(jsonData)) {
          setError(
            'Похоже один из файлов поставщика не содержит ключевые данные по артикулам или срокам.',
          );
          resetFileInput();
          setLoadedFiles([]);
          onReset();
          return;
        }

        // Обновляем/добавляем по имени (если загружают тот же файл повторно)
        const existingIdx = baseLoaded.findIndex((f) => f.name === file.name);
        if (existingIdx >= 0) {
          baseLoaded[existingIdx] = { name: file.name, data: jsonData };
        } else {
          if (baseLoaded.length < 2) {
            baseLoaded.push({ name: file.name, data: jsonData });
          }
        }
      }

      const loadedNames: string[] = [];
      for (const f of baseLoaded) {
        loadedNames.push(f.name);
      }

      // Для DKC важно держать файлы раздельно, чтобы сроки брались из нужного файла.
      // Поэтому если загружены одновременно 1100 и 1200 — НЕ объединяем данные в один массив.
      const isDkc = (name: string) => {
        const n = name.toLowerCase();
        return n.includes("dkc maga del 1100") || n.includes("dkc maga del 1200");
      };
      const hasBothDkc =
        baseLoaded.some((f) => (f.name || "").toLowerCase().includes("dkc maga del 1100")) &&
        baseLoaded.some((f) => (f.name || "").toLowerCase().includes("dkc maga del 1200"));

      const mergedData: any[] = [];
      if (!(baseLoaded.length === 2 && hasBothDkc && baseLoaded.every((f) => isDkc(f.name)))) {
        for (const f of baseLoaded) {
          mergedData.push(...f.data);
        }
      }

      setLoadedFiles(baseLoaded);

      const combinedName = loadedNames.join(" | ");
      setSuccess(
        loadedNames.length > 1
          ? "Загружены корректные файлы."
          : "Загружен корректный файл.",
      );
      setFileName(combinedName);
      onSuccess(mergedData, combinedName, baseLoaded);
    } catch (err) {
      setError('Ошибка при чтении файла.');
      resetFileInput();
      setLoadedFiles([]);
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

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setError(null);
    setSuccess(null);
    setLoadedFiles([]);
    resetFileInput();
    onReset();
  };

  return (
    <div
      className={styles.timeContainer}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {isLoading ? (
        <Loader /> // Показываем Loader во время загрузки
      ) : (
        <>
          <div className={styles.timeUploadBox} onClick={handleButtonClick}>
            {fileName && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClear}
                aria-label="Очистить загруженные файлы"
              >
                ×
              </button>
            )}
            <p className={styles.timeParagraf}>
              {fileName
                ? `Загружен файл: ${fileName}`
                : 'Перетащите или нажмите, чтобы выбрать файл со сроками поставщика'}
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          {error && <p className={styles.timeError}>{error}</p>}
          {success && <p className={styles.timeSuccess}>{success}</p>}
        </>
      )}
    </div>
  );
};

export default DeliveryTime;
