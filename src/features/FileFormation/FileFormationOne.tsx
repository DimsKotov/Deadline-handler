import React, { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

interface FileFormationOneProps {
  deliveryTimeData: any[];
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
}

const FileFormationOne: React.FC<FileFormationOneProps> = ({
  deliveryTimeData,
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
    
    if (deliveryTimeData && deliveryTimeData.length > 0 && !hasDownloadedRef.current) {
      hasDownloadedRef.current = true;
      setTimeout(() => {
        handleDownload();
      }, 100);
    }
  }, [deliveryTimeData, downloadTrigger]);

  const normalizeColumnName = (name: string): string => {
    return name?.toString().replace(/\s+/g, '').toLowerCase() || '';
  };

  const findProcessingColumn = (row: any): string | null => {
    const possibleColumnNames = [
      "Срок Готовн Отгр (Обработка)",
      "Срок",
      "Срок производства",
      "Срок изготовления",
      "Производство",
      "готовность товара",
      "Срок отгрузки",
      "Срок Готовн",
      "Срок Готовн Отгр",
      "Срок Готовности",
      "Изготовление",
      "Новый срок",
    ];
    
    const normalizedRowKeys = Object.keys(row).map(key => normalizeColumnName(key));
    for (const columnName of possibleColumnNames) {
      const normalizedColumnName = normalizeColumnName(columnName);
      const index = normalizedRowKeys.indexOf(normalizedColumnName);
      if (index !== -1) {
        return Object.keys(row)[index];
      }
    }
    return null;
  };

  const processProcessingValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '!!!';
    }
    const strValue = value.toString().trim();
    const numValue = parseFloat(strValue.replace(',', '.'));
    if (isNaN(numValue) || numValue === 0) {
      return '!!!';
    }
    return strValue;
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
        const copyData = deliveryTimeData.map(row => {
          const processingColumn = findProcessingColumn(row);
          let processingValue = '';
          if (processingColumn) {
            processingValue = processProcessingValue(row[processingColumn]);
          } else {
            processingValue = '!!!';
          }
          
          return {
            "ЦС": csValue,
            "Код": row["Код"] ?? "",
            "Тип": "",
            "Организация": "",
            "Предварительная обработка": "",
            "Обработка": processingValue,
            "Заключительная обработка": "",
            "Статус": "",
            "Сообщение": ""
          };
        });
        allData.push(...copyData);
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

export default FileFormationOne;