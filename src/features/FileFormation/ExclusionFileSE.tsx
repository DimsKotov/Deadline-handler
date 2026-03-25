import React, { useEffect, useRef } from 'react';
import {
  processProcessingValue,
  downloadBlob,
  createApexExcelBlobFromTemplate,
} from '../../utils/ExcelUtils';

interface ExclusionFileSEProps {
  deliveryTimeData: any[];
  deliveryData: any[];
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
  splitFilesEnabled?: boolean;
  splitRowsLimit?: number;
  supplierName?: string;
  moscowColumnFound: boolean;
  ekaterinburgColumnFound: boolean;
}

const ExclusionFileSE: React.FC<ExclusionFileSEProps> = ({
  deliveryTimeData,
  deliveryData,
  downloadTrigger,
  onProcessingComplete,
  splitFilesEnabled = true,
  splitRowsLimit = 9990,
  supplierName = "",
  moscowColumnFound,
  ekaterinburgColumnFound
}) => {
  const getApexFileName = (suffix?: string) => {
    const supplierPart = supplierName.trim() ? ` ${supplierName.trim()}` : "";
    const suffixPart = suffix ? ` ${suffix}` : "";
    return `Файл для загрузки APEX${supplierPart}${suffixPart}.xlsx`;
  };

  const hasDownloadedRef = useRef(false);
  const lastTriggerRef = useRef(downloadTrigger);

  useEffect(() => {
    if (downloadTrigger !== lastTriggerRef.current) {
      hasDownloadedRef.current = false;
      lastTriggerRef.current = downloadTrigger;
    }
    
    if (deliveryTimeData && deliveryTimeData.length > 0 &&
        deliveryData && deliveryData.length > 0 &&
        !hasDownloadedRef.current) {
      hasDownloadedRef.current = true;
      setTimeout(() => {
        handleDownload();
      }, 100);
    }
  }, [deliveryTimeData, deliveryData, downloadTrigger]);

  // Функция для нормализации названия столбца
  const normalizeColumnName = (name: string): string => {
    if (!name) return '';
    return name.toString().trim().toLowerCase();
  };

  // Функция для нормализации значения (для сравнения)
  const normalizeValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    return value.toString().trim();
  };

  // Функция для поиска столбца с артикулом
  const findArticleColumn = (row: any): string | null => {
    const possibleColumnNames = [
      "Артикул",
      "Артикул товара",
      "Артикул продукции",
      "Артикул изделия",
      "Артикул позиции",
      "Article",
      "Article number",
      "Product article",
      "Референс",
      "SKU",
      "Код товара",
      "Код продукции",
      "Код изделия",
      "Код позиции"
    ];
    
    const rowKeys = Object.keys(row);
    
    // Сначала ищем точное совпадение после нормализации
    for (const columnName of possibleColumnNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeColumnName(rowKey);
        if (normalizedRowKey === normalizedColumnName) {
          return rowKey;
        }
      }
    }
    
    // Если точного совпадения нет, ищем частичное совпадение
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey.includes('артикул') ||
          normalizedRowKey.includes('article') ||
          normalizedRowKey.includes('референс') ||
          normalizedRowKey.includes('кодтовара') ||
          normalizedRowKey.includes('кодпродукции') ||
          normalizedRowKey.includes('кодизделия') ||
          normalizedRowKey.includes('кодпозиции')) {
        return rowKey;
      }
    }
    
    return null;
  };

  // Функция поиска столбца "Код" в deliveryData
  const findCodeColumnInDeliveryData = (row: any): string | null => {
    const possibleCodeColumnNames = [
      "Код",
      "Артикул",
      "Артикул поставщика",
      "Код позиции",
      "Код товара",
      "Артикул товара",
      "Код продукции",
      "Артикул продукции",
      "Код изделия",
      "Артикул изделия",
      "Article",
      "Article number",
      "Product code",
      "Референс",
      "SKU"
    ];
    
    const rowKeys = Object.keys(row);
    
    // Сначала ищем точное совпадение после нормализации
    for (const columnName of possibleCodeColumnNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeColumnName(rowKey);
        if (normalizedRowKey === normalizedColumnName) {
          return rowKey;
        }
      }
    }
    
    // Если точного совпадения нет, ищем частичное совпадение
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey.includes('код') ||
          normalizedRowKey.includes('артикул') ||
          normalizedRowKey.includes('article') ||
          normalizedRowKey.includes('референс') ||
          normalizedRowKey.includes('product') ||
          normalizedRowKey.includes('item')) {
        return rowKey;
      }
    }
    
    return null;
  };

  // Функция для поиска столбца "Срок готовности к отгрузке со склада Москва"
  const findMoscowColumn = (row: any): string | null => {
    const possibleNames = [
      "Срок готовности к отгрузке со склада Москва",
      "Срок готовности Москва",
      "Москва срок",
      "Срок Москва",
      "Срок отгрузки Москва",
      "Москва отгрузка"
    ];
    
    const rowKeys = Object.keys(row);
    
    // Ищем точное совпадение
    for (const columnName of possibleNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeColumnName(rowKey);
        if (normalizedRowKey === normalizedColumnName) {
          return rowKey;
        }
      }
    }
    
    // Ищем частичное совпадение
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey.includes('москва') && 
          (normalizedRowKey.includes('срок') || normalizedRowKey.includes('отгрузк'))) {
        return rowKey;
      }
    }
    
    return null;
  };

  // Функция для поиска столбца "Срок готовности к отгрузке со склада Екатеринбург"
  const findEkaterinburgColumn = (row: any): string | null => {
    const possibleNames = [
      "Срок готовности к отгрузке со склада Екатеринбург",
      "Срок готовности Екатеринбург",
      "Екатеринбург срок",
      "Срок Екатеринбург",
      "Срок отгрузки Екатеринбург",
      "Екатеринбург отгрузка"
    ];
    
    const rowKeys = Object.keys(row);
    
    // Ищем точное совпадение
    for (const columnName of possibleNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeColumnName(rowKey);
        if (normalizedRowKey === normalizedColumnName) {
          return rowKey;
        }
      }
    }
    
    // Ищем частичное совпадение
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if ((normalizedRowKey.includes('екатеринбург') || normalizedRowKey.includes('екб')) && 
          (normalizedRowKey.includes('срок') || normalizedRowKey.includes('отгрузк'))) {
        return rowKey;
      }
    }
    
    return null;
  };

  // Функция для создания хэш-таблицы артикул -> код
  const createArticleToCodeMap = (): {
    map: Map<string, string>;
    articleColumn: string | null;
    codeColumn: string | null;
  } => {
    if (!deliveryData || deliveryData.length === 0) {
      return { map: new Map(), articleColumn: null, codeColumn: null };
    }
    
    const firstRow = deliveryData[0];
    const articleColumn = findArticleColumn(firstRow);
    const codeColumn = findCodeColumnInDeliveryData(firstRow);
    
    if (!articleColumn || !codeColumn) {
      return { map: new Map(), articleColumn, codeColumn };
    }
    
    // Создаем хэш-таблицу для быстрого поиска
    const map = new Map<string, string>();
    
    for (let i = 0; i < deliveryData.length; i++) {
      const row = deliveryData[i];
      const article = normalizeValue(row[articleColumn]);
      const code = normalizeValue(row[codeColumn]);
      
      if (article && code) {
        map.set(article, code);
      }
    }
    
    return { map, articleColumn, codeColumn };
  };

  // Функция для создания файла
  const createFile = async (data: any[]): Promise<{ blob: Blob, fileName: string }> => {
    const totalRows = data.length;
    console.log(`Создаю один Excel файл (${totalRows} строк)`);

    const APEX_HEADERS = [
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

    const blob = await createApexExcelBlobFromTemplate(
      data,
      APEX_HEADERS,
      "Шаблон для загрузки APEX.xlsx",
      "Импортированные данные",
    );

    return { blob, fileName: getApexFileName('(особые правила)') };
  };

  // Функция для создания всех данных
  const createAllData = (): any[] => {
    console.time('Create hash map');
    const { map: articleToCodeMap, articleColumn, codeColumn } = createArticleToCodeMap();
    console.timeEnd('Create hash map');
    
    if (!articleColumn || !codeColumn || articleToCodeMap.size === 0) {
      console.log("Нет данных для формирования файла");
      return [];
    }
    
    console.log(`Создана хэш-таблица с ${articleToCodeMap.size} записями`);
    
    // Находим столбец с артикулом в deliveryTimeData
    const firstTimeRow = deliveryTimeData[0];
    const timeArticleColumn = findCodeColumnInDeliveryData(firstTimeRow);
    
    // Находим столбцы Москвы и Екатеринбурга
    const moscowColumn = findMoscowColumn(firstTimeRow);
    const ekaterinburgColumn = findEkaterinburgColumn(firstTimeRow);
    
    if (!timeArticleColumn || (!moscowColumn && !ekaterinburgColumn)) {
      console.log("Не найдены необходимые столбцы в файле поставщика");
      return [];
    }
    
    console.log(`Найден столбец Москвы: ${moscowColumn}`);
    console.log(`Найден столбец Екатеринбурга: ${ekaterinburgColumn}`);
    
    console.time('Filter and process data');
    
    // Определяем значения ЦС для каждого склада
    const moscowCS = ["R01", "R02", "R04", "R31", "R77", "V30"];
    const ekaterinburgCS = ["R29", "R19"];
    
    const allData: any[] = [];
    
    // Создаем массив для отфильтрованных данных
    const filteredTimeData: any[] = [];
    
    // Фильтруем deliveryTimeData один раз
    for (let i = 0; i < deliveryTimeData.length; i++) {
      const timeRow = deliveryTimeData[i];
      const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
      
      if (timeArticle && articleToCodeMap.has(timeArticle)) {
        filteredTimeData.push(timeRow);
      }
    }
    
    console.log(`Найдено ${filteredTimeData.length} совпадений из ${deliveryTimeData.length} строк`);
    
    // Формируем данные для Москвы
    for (let i = 0; i < moscowCS.length; i++) {
      const csValue = moscowCS[i];
      
      for (let j = 0; j < filteredTimeData.length; j++) {
        const timeRow = filteredTimeData[j];
        const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
        const code = articleToCodeMap.get(timeArticle);
        
        let processingValue = '!!!';
        if (moscowColumn) {
          processingValue = processProcessingValue(timeRow[moscowColumn]);
        }
        
        allData.push({
          "ЦС": csValue,
          "Код": code || "",
          "Тип": "",
          "Организация": "",
          "Предварительная обработка": "",
          "Обработка": processingValue,
          "Заключительная обработка": "",
          "Статус": "",
          "Сообщение": ""
        });
      }
    }
    
    // Формируем данные для Екатеринбурга
    for (let i = 0; i < ekaterinburgCS.length; i++) {
      const csValue = ekaterinburgCS[i];
      
      for (let j = 0; j < filteredTimeData.length; j++) {
        const timeRow = filteredTimeData[j];
        const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
        const code = articleToCodeMap.get(timeArticle);
        
        let processingValue = '!!!';
        if (ekaterinburgColumn) {
          processingValue = processProcessingValue(timeRow[ekaterinburgColumn]);
        }
        
        allData.push({
          "ЦС": csValue,
          "Код": code || "",
          "Тип": "",
          "Организация": "",
          "Предварительная обработка": "",
          "Обработка": processingValue,
          "Заключительная обработка": "",
          "Статус": "",
          "Сообщение": ""
        });
      }
    }
    
    console.timeEnd('Filter and process data');
    
    if (allData.length === 0) {
      console.log("Нет данных для формирования файла");
    } else {
      console.log(`Сформировано ${allData.length} строк данных`);
    }
    
    return allData;
  };

  // Основная функция обработки
  const handleDownload = async () => {
    try {
      console.time('ExclusionFileSE Processing');
      
      // Проверяем, что найдены нужные столбцы
      if (!moscowColumnFound && !ekaterinburgColumnFound) {
        console.log("Не найдены столбцы Москвы или Екатеринбурга");
        if (onProcessingComplete) {
          onProcessingComplete(false);
        }
        return;
      }
      
      // Создаем все данные
      const allData = createAllData();
      
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
        try {
          const { blob, fileName } = await createFile(allData);
          const success = await downloadBlob(blob, fileName);
          
          if (onProcessingComplete) {
            onProcessingComplete(success);
          }
        } catch (error) {
          console.error('Ошибка при создании файла:', error);
          if (onProcessingComplete) {
            onProcessingComplete(false);
          }
        }
      } else {
        // РЕЖИМ "РАЗБИВАТЬ ФАЙЛЫ" - стандартная логика (9990 строк на файл)
        const MAX_ROWS = splitRowsLimit;
        const totalParts = Math.ceil(allData.length / MAX_ROWS);
        let allDownloadsSuccessful = true;
        
        for (let part = 1; part <= totalParts; part++) {
          const startIndex = (part - 1) * MAX_ROWS;
          const endIndex = Math.min(part * MAX_ROWS, allData.length);
          const partData = allData.slice(startIndex, endIndex);

          const APEX_HEADERS = [
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

          const blob = await createApexExcelBlobFromTemplate(
            partData,
            APEX_HEADERS,
            "Шаблон для загрузки APEX.xlsx",
            "Импортированные данные",
          );
          const fileName = getApexFileName(`(особые правила, часть ${part} из ${totalParts})`);
          
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
      
      console.timeEnd('ExclusionFileSE Processing');
    } catch (error) {
      console.error('Ошибка при формировании файла:', error);
      if (onProcessingComplete) {
        onProcessingComplete(false);
      }
    }
  };

  return null;
};

export default ExclusionFileSE;