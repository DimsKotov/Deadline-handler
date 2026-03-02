import React, { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

interface FileFormationTwoProps {
  deliveryTimeData: any[];
  deliveryData: any[];
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
}

const FileFormationTwo: React.FC<FileFormationTwoProps> = ({
  deliveryTimeData,
  deliveryData,
  downloadTrigger,
  onProcessingComplete
}) => {
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

  const normalizeColumnName = (name: string): string => {
    return name?.toString().replace(/\s+/g, '').toLowerCase() || '';
  };

  const findProcessingColumnInDeliveryTime = (row: any): string | null => {
    const possibleColumnNames = [
      "Срок",
      "Срок производства",
      "Срок изготовления",
      "Срок поставки",
      "Срок выполнения",
      "Сроки",
      "Сроки производства",
      "Сроки изготовления",
      "Сроки поставки",
      "Сроки выполнения",
      "Время производства",
      "Время изготовления",
      "Время поставки"
    ];
    
    const normalizedRowKeys = Object.keys(row).map(key => normalizeColumnName(key));
    for (const columnName of possibleColumnNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      const index = normalizedRowKeys.indexOf(normalizedColumnName);
      if (index !== -1) {
        return Object.keys(row)[index];
      }
    }
    
    for (let i = 0; i < normalizedRowKeys.length; i++) {
      const normalizedKey = normalizedRowKeys[i];
      if (normalizedKey.includes('срок') ||
          normalizedKey.includes('production') ||
          normalizedKey.includes('manufacturing') ||
          normalizedKey.includes('delivery') ||
          normalizedKey.includes('lead') ||
          normalizedKey.includes('time') ||
          normalizedKey.includes('term') ||
          normalizedKey.includes('время')) {
        return Object.keys(row)[i];
      }
    }
    return null;
  };

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
      "Item article",
      "SKU",
      "Код товара",
      "Код продукции",
      "Код изделия",
      "Код позиции"
    ];
    
    const normalizedRowKeys = Object.keys(row).map(key => normalizeColumnName(key));
    for (const columnName of possibleColumnNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      const index = normalizedRowKeys.indexOf(normalizedColumnName);
      if (index !== -1) {
        return Object.keys(row)[index];
      }
    }
    
    for (let i = 0; i < normalizedRowKeys.length; i++) {
      const normalizedKey = normalizedRowKeys[i];
      if (normalizedKey.includes('артикул') ||
          normalizedKey.includes('article') ||
          normalizedKey.includes('sku') ||
          normalizedKey.includes('кодтовара') ||
          normalizedKey.includes('кодпродукции') ||
          normalizedKey.includes('кодизделия') ||
          normalizedKey.includes('кодпозиции')) {
        return Object.keys(row)[i];
      }
    }
    return null;
  };

  const findCodeColumnInDeliveryData = (row: any): string | null => {
    const possibleColumnNames = ["Код"];
    const normalizedRowKeys = Object.keys(row).map(key => normalizeColumnName(key));
    
    for (const columnName of possibleColumnNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      const index = normalizedRowKeys.indexOf(normalizedColumnName);
      if (index !== -1) {
        return Object.keys(row)[index];
      }
    }
    
    for (let i = 0; i < normalizedRowKeys.length; i++) {
      const normalizedKey = normalizedRowKeys[i];
      if (normalizedKey.includes('код') ||
          normalizedKey.includes('code') ||
          normalizedKey.includes('номер') ||
          normalizedKey.includes('number')) {
        return Object.keys(row)[i];
      }
    }
    return null;
  };

  const processProcessingValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '!!!';
    }
    const strValue = value.toString().trim();
    if (strValue === '!!!') {
      return '!!!';
    }
    const numValue = parseFloat(strValue.replace(',', '.'));
    if (isNaN(numValue) || numValue === 0) {
      return '!!!';
    }
    return strValue;
  };

  const findMatchingData = (timeRow: any): {
    code: string | null;
    processingValue: string | null;
    hasMatch: boolean;
  } => {
    if (!deliveryData || deliveryData.length === 0) {
      return { code: null, processingValue: null, hasMatch: false };
    }
    
    const timeCode = timeRow["Код"] ?? "";
    if (!timeCode) {
      return { code: null, processingValue: null, hasMatch: false };
    }
    
    const firstRow = deliveryData[0];
    const articleColumn = findArticleColumn(firstRow);
    if (!articleColumn) {
      return { code: null, processingValue: null, hasMatch: false };
    }
    
    const codeColumn = findCodeColumnInDeliveryData(firstRow);
    if (!codeColumn) {
      return { code: null, processingValue: null, hasMatch: false };
    }
    
    for (const dataRow of deliveryData) {
      const articleValue = dataRow[articleColumn];
      if (articleValue !== null && articleValue !== undefined &&
          articleValue.toString().trim() === timeCode.toString().trim()) {
        const timeProcessingColumn = findProcessingColumnInDeliveryTime(timeRow);
        let processingValue = '!!!';
        if (timeProcessingColumn) {
          processingValue = processProcessingValue(timeRow[timeProcessingColumn]);
        }
        return {
          code: dataRow[codeColumn]?.toString() || "",
          processingValue,
          hasMatch: true
        };
      }
    }
    return { code: null, processingValue: null, hasMatch: false };
  };

  const createWorkbookFromData = (data: any[], partNumber?: number): Blob => {
    const headers = [
      "ЦС",
      "Код",
      "Тип",
      "Организация",
      "Предварительная обработка",
      "Обработка",
      "Заключительная обработка",
      "Статус",
      "Сообщение"
    ];

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Импортированные данные");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/octet-stream' });
  };

  const downloadFile = (blob: Blob, fileName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        link.onload = () => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve(true);
        };
        
        link.onerror = () => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve(false);
        };
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            resolve(true);
          }
        }, 100);
      } catch (error) {
        console.error('Ошибка при скачивании файла:', error);
        resolve(false);
      }
    });
  };

  const handleDownload = async () => {
    try {
      const csValues = ["R01", "R31", "R77", "R04", "R02", "R29", "R19", "V30"];
      const allData = [];
      
      for (let copyIndex = 0; copyIndex < 8; copyIndex++) {
        const csValue = csValues[copyIndex];
        const filteredData = deliveryTimeData.filter(timeRow => {
          const matchResult = findMatchingData(timeRow);
          return matchResult.hasMatch;
        });
        
        const copyData = filteredData.map(timeRow => {
          const matchResult = findMatchingData(timeRow);
          return {
            "ЦС": csValue,
            "Код": matchResult.code || "",
            "Тип": "",
            "Организация": "",
            "Предварительная обработка": "",
            "Обработка": matchResult.processingValue || "!!!",
            "Заключительная обработка": "",
            "Статус": "",
            "Сообщение": ""
          };
        });
        allData.push(...copyData);
      }

      if (allData.length === 0) {
        console.log("Нет данных для формирования файла (не найдено совпадений артикулов)");
        if (onProcessingComplete) {
          onProcessingComplete(false);
        }
        return;
      }

      const MAX_ROWS = 49900;
      const totalRows = allData.length;
      
      if (totalRows <= MAX_ROWS) {
        // Если строк меньше или равно лимиту - скачиваем один файл
        const blob = createWorkbookFromData(allData);
        const success = await downloadFile(blob, 'Файл для загрузки APEX.xlsx');
        if (onProcessingComplete) {
          onProcessingComplete(success);
        }
      } else {
        // Если строк больше лимита - разбиваем на несколько файлов
        const totalParts = Math.ceil(totalRows / MAX_ROWS);
        let allDownloadsSuccessful = true;
        
        for (let part = 1; part <= totalParts; part++) {
          const startIndex = (part - 1) * MAX_ROWS;
          const endIndex = Math.min(part * MAX_ROWS, totalRows);
          const partData = allData.slice(startIndex, endIndex);
          
          const blob = createWorkbookFromData(partData, part);
          const fileName = `Файл для загрузки APEX (часть ${part} из ${totalParts}).xlsx`;
          const success = await downloadFile(blob, fileName);
          
          if (!success) {
            allDownloadsSuccessful = false;
          }
          
          // Небольшая задержка между скачиваниями файлов
          if (part < totalParts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (onProcessingComplete) {
          onProcessingComplete(allDownloadsSuccessful);
        }
      }
    } catch (error) {
      console.error('Ошибка при формировании файла:', error);
      if (onProcessingComplete) {
        onProcessingComplete(false);
      }
    }
  };

  return null;
};

export default FileFormationTwo;