import React, { useEffect, useRef, useState } from 'react';
import ExclusionFileSE from './ExclusionFileSE'; // Импорт компонента для особых правил
import ExclusionFileDKC from './ExclusionFileDKC';
import ExclusionFileBetterman from './ExclusionFileBetterman';
import { downloadBlob, createExcelBlob } from '../../utils/ExcelUtils';
import { buildStandardAllData } from './FileFormationService';

interface FileFormationTwoProps {
  deliveryTimeData: any[];
  deliveryData: any[];
  deliveryTimeFileName?: string | null;
  deliveryTimeSources?: Array<{ name: string; data: any[] }>;
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
  splitFilesEnabled?: boolean;
}

const FileFormationTwo: React.FC<FileFormationTwoProps> = ({
  deliveryTimeData,
  deliveryData,
  deliveryTimeFileName = null,
  deliveryTimeSources = [],
  downloadTrigger,
  onProcessingComplete,
  splitFilesEnabled = true,
}) => {
  const hasDownloadedRef = useRef(false);
  const lastTriggerRef = useRef(downloadTrigger);
  const [useExclusionFile, setUseExclusionFile] = useState(false);
  const [useDkcExclusionFile, setUseDkcExclusionFile] = useState(false);
  const [useBettermanExclusionFile, setUseBettermanExclusionFile] = useState(false);
  const [moscowColumnFound, setMoscowColumnFound] = useState(false);
  const [ekaterinburgColumnFound, setEkaterinburgColumnFound] = useState(false);

  // Функция для нормализации названия столбца
  const normalizeColumnName = (name: string): string => {
    if (!name) return '';
    return name.toString().trim().toLowerCase();
  };

  // Функция для проверки наличия особых столбцов
  const checkForSpecialColumns = (data: any[]): { moscow: boolean, ekaterinburg: boolean } => {
    if (!data || data.length === 0) {
      return { moscow: false, ekaterinburg: false };
    }
    
    const firstRow = data[0];
    const rowKeys = Object.keys(firstRow);
    
    let moscowFound = false;
    let ekaterinburgFound = false;
    
    // Проверяем наличие столбцов Москвы и Екатеринбурга
    for (const key of rowKeys) {
      const normalizedKey = normalizeColumnName(key);
      
      // Проверяем столбец Москвы
      if (normalizedKey.includes('москва') && 
          (normalizedKey.includes('срок') || normalizedKey.includes('отгрузк'))) {
        moscowFound = true;
      }
      
      // Проверяем столбец Екатеринбурга
      if ((normalizedKey.includes('екатеринбург') || normalizedKey.includes('екб')) && 
          (normalizedKey.includes('срок') || normalizedKey.includes('отгрузк'))) {
        ekaterinburgFound = true;
      }
      
      // Проверяем точные совпадения
      if (normalizedKey === normalizeColumnName("Срок готовности к отгрузке со склада Москва")) {
        moscowFound = true;
      }
      
      if (normalizedKey === normalizeColumnName("Срок готовности к отгрузке со склада Екатеринбург")) {
        ekaterinburgFound = true;
      }
    }
    
    return { moscow: moscowFound, ekaterinburg: ekaterinburgFound };
  };

  useEffect(() => {
    if (downloadTrigger !== lastTriggerRef.current) {
      hasDownloadedRef.current = false;
      lastTriggerRef.current = downloadTrigger;
      setUseExclusionFile(false);
      setUseDkcExclusionFile(false);
      setUseBettermanExclusionFile(false);
    }
    
    const hasTimeData =
      (deliveryTimeData && deliveryTimeData.length > 0) ||
      (deliveryTimeSources && deliveryTimeSources.some((s) => s.data && s.data.length > 0));

    if (hasTimeData &&
        deliveryData && deliveryData.length > 0 &&
        !hasDownloadedRef.current) {

      // DKC исключение по имени файла из DeliveryTime
      const lowerName = (deliveryTimeFileName || "").toLowerCase();
      if (
        lowerName.includes("dkc maga del 1100".toLowerCase()) ||
        lowerName.includes("dkc maga del 1200".toLowerCase())
      ) {
        console.log("Обнаружен DKC файл. Запускаем ExclusionFileDKC");
        setUseDkcExclusionFile(true);
        hasDownloadedRef.current = true;
        return;
      }

      // Betterman исключение по имени файла из DeliveryTime
      if (lowerName.includes("betterman") || lowerName.includes("беттерман")) {
        console.log("Обнаружен Betterman файл. Запускаем ExclusionFileBetterman");
        setUseBettermanExclusionFile(true);
        hasDownloadedRef.current = true;
        return;
      }
      
      // Проверяем наличие особых столбцов
      const specialColumns = checkForSpecialColumns(deliveryTimeData);
      setMoscowColumnFound(specialColumns.moscow);
      setEkaterinburgColumnFound(specialColumns.ekaterinburg);
      
      console.log('Проверка особых столбцов:', {
        moscow: specialColumns.moscow,
        ekaterinburg: specialColumns.ekaterinburg,
        deliveryTimeRows: deliveryTimeData.length,
        deliveryDataRows: deliveryData.length
      });
      
      // Если найден хотя бы один особый столбец, используем ExclusionFileSE
      if (specialColumns.moscow || specialColumns.ekaterinburg) {
        console.log('Обнаружены особые столбцы. Запускаем ExclusionFileSE');
        setUseExclusionFile(true);
        hasDownloadedRef.current = true;
      } else {
        console.log('Особые столбцы не обнаружены. Используем стандартную обработку');
        hasDownloadedRef.current = true;
        setTimeout(() => {
          handleStandardDownload();
        }, 100);
      }
    }
  }, [deliveryTimeData, deliveryTimeSources, deliveryData, downloadTrigger, deliveryTimeFileName]);

  const EXCEL_HEADERS = [
    "ЦС",
    "Код",
    "Тип",
    "Организация",
    "Предварительная обработка",
    "Обработка",
    "Заключительная обработка",
    "Статус",
    "Сообщение",
  ];

  // Стандартная функция обработки (оригинальная логика)
  const handleStandardDownload = async () => {
    try {
      console.time('FileFormationTwo Processing');
      
      // Создаем все данные через сервис
      const allData = buildStandardAllData(deliveryTimeData, deliveryData);
      
      if (allData.length === 0) {
        console.log("Нет данных для формирования файла");
        if (onProcessingComplete) {
          onProcessingComplete(false);
        }
        return;
      }
      
      const totalRows = allData.length;
      console.log(`Сформировано ${totalRows} строк данных`);
      
      if (!splitFilesEnabled) {
        // РЕЖИМ "НЕ РАЗБИВАТЬ ФАЙЛ" - создаем один файл
        const blob = createExcelBlob(allData, EXCEL_HEADERS, "Импортированные данные");
        const success = await downloadBlob(blob, 'Файл для загрузки APEX.xlsx');
        
        if (onProcessingComplete) {
          onProcessingComplete(success);
        }
      } else {
        // РЕЖИМ "РАЗБИВАТЬ ФАЙЛЫ" - стандартная логика (9990 строк на файл)
        const MAX_ROWS = 9990;
        const totalParts = Math.ceil(allData.length / MAX_ROWS);
        let allDownloadsSuccessful = true;
        
        for (let part = 1; part <= totalParts; part++) {
          const startIndex = (part - 1) * MAX_ROWS;
          const endIndex = Math.min(part * MAX_ROWS, allData.length);
          const partData = allData.slice(startIndex, endIndex);
          
          const blob = createExcelBlob(partData, EXCEL_HEADERS, "Импортированные данные");
          const fileName = `Файл для загрузки APEX (часть ${part} из ${totalParts}).xlsx`;
          
          const success = await downloadBlob(blob, fileName);
          if (!success) {
            allDownloadsSuccessful = false;
          }
          
          // Задержка между файлами
          if (part < totalParts) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        if (onProcessingComplete) {
          onProcessingComplete(allDownloadsSuccessful);
        }
      }
      
      console.timeEnd('FileFormationTwo Processing');
    } catch (error) {
      console.error('Ошибка при формировании файла:', error);
      if (onProcessingComplete) {
        onProcessingComplete(false);
      }
    }
  };

  // Если нужно использовать ExclusionFileSE, рендерим его
  if (useDkcExclusionFile) {
    return (
      <ExclusionFileDKC
        deliveryTimeData={deliveryTimeData}
        deliveryData={deliveryData}
        deliveryTimeFileName={deliveryTimeFileName}
        deliveryTimeSources={deliveryTimeSources}
        downloadTrigger={downloadTrigger}
        onProcessingComplete={onProcessingComplete}
        splitFilesEnabled={splitFilesEnabled}
      />
    );
  }

  if (useBettermanExclusionFile) {
    return (
      <ExclusionFileBetterman
        deliveryTimeData={deliveryTimeData}
        deliveryData={deliveryData}
        downloadTrigger={downloadTrigger}
        onProcessingComplete={onProcessingComplete}
        splitFilesEnabled={splitFilesEnabled}
      />
    );
  }

  if (useExclusionFile) {
    return (
      <ExclusionFileSE
        deliveryTimeData={deliveryTimeData}
        deliveryData={deliveryData}
        downloadTrigger={downloadTrigger}
        onProcessingComplete={onProcessingComplete}
        splitFilesEnabled={splitFilesEnabled}
        moscowColumnFound={moscowColumnFound}
        ekaterinburgColumnFound={ekaterinburgColumnFound}
      />
    );
  }

  // Иначе рендерим null (стандартная обработка уже запущена через useEffect)
  return null;
};

export default FileFormationTwo;