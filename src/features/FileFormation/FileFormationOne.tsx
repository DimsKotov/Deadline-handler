import React, { useEffect, useRef } from "react";
import { processProcessingValue, downloadBlob, createExcelBlob } from "../../utils/ExcelUtils";

interface FileFormationOneProps {
  deliveryTimeData: any[];
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
  splitFilesEnabled?: boolean; // НОВЫЙ проп: управление разбиением файлов
  splitRowsLimit?: number;
  supplierName?: string;
}

const FileFormationOne: React.FC<FileFormationOneProps> = ({
  deliveryTimeData,
  downloadTrigger,
  onProcessingComplete,
  splitFilesEnabled = true, // По умолчанию включено разбиение
  splitRowsLimit = 9990,
  supplierName = "",
}) => {
  const hasDownloadedRef = useRef(false);
  const lastTriggerRef = useRef(downloadTrigger);

  useEffect(() => {
    if (downloadTrigger !== lastTriggerRef.current) {
      hasDownloadedRef.current = false;
      lastTriggerRef.current = downloadTrigger;
    }
    if (
      deliveryTimeData &&
      deliveryTimeData.length > 0 &&
      !hasDownloadedRef.current
    ) {
      hasDownloadedRef.current = true;
      setTimeout(() => {
        handleDownload();
      }, 100);
    }
  }, [deliveryTimeData, downloadTrigger]);

  // Функция для нормализации названия столбца
  const normalizeColumnName = (name: string): string => {
    if (!name) return "";
    return name.toString().trim().toLowerCase();
  };

  // Улучшенная функция поиска столбца со сроками
  const findProcessingColumn = (row: any): string | null => {
    const possibleColumnNames = [
      "Срок Готовн Отгр (Обработка)",
      "Срок",
      "Сроки",
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
      // Проверяем, содержит ли название столбца ключевые слова
      if (
        normalizedRowKey.includes("срок") ||
        normalizedRowKey.includes("производство") ||
        normalizedRowKey.includes("изготовление") ||
        normalizedRowKey.includes("готовность") ||
        normalizedRowKey.includes("отгрузки") ||
        normalizedRowKey.includes("готовн")
      ) {
        return rowKey;
      }
    }

    return null;
  };

  // Функция для поиска столбца по ключевому слову
  const findColumnByKeyword = (row: any, keyword: string): string | null => {
    const rowKeys = Object.keys(row);
    const normalizedKeyword = normalizeColumnName(keyword);

    // Сначала ищем точное совпадение
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey === normalizedKeyword) {
        return rowKey;
      }
    }

    // Затем ищем частичное совпадение
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey.includes(normalizedKeyword)) {
        return rowKey;
      }
    }

    return null;
  };

  // Функция для проверки обязательных столбцов
  const validateRequiredColumns = (
    data: any[],
  ): { isValid: boolean; missingColumns: string[] } => {
    if (!data || data.length === 0) {
      return { isValid: false, missingColumns: ["Нет данных для проверки"] };
    }

    const firstRow = data[0];
    const missingColumns: string[] = [];

    // Проверяем наличие столбца "ЦС"
    const csColumn = findColumnByKeyword(firstRow, "ЦС");
    if (!csColumn) {
      missingColumns.push("ЦС");
    }

    // Проверяем наличие столбца "Код"
    const codeColumn = findColumnByKeyword(firstRow, "Код");
    if (!codeColumn) {
      missingColumns.push("Код");
    }

    // Проверяем наличие хотя бы одного из столбцов со сроками
    const processingColumn = findProcessingColumn(firstRow);
    if (!processingColumn) {
      missingColumns.push(
        "столбец со сроками (один из: Срок, Сроки, Срок производства и т.д.)",
      );
    }

    return {
      isValid: missingColumns.length === 0,
      missingColumns,
    };
  };

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

  const getApexFileName = (suffix?: string) => {
    const supplierPart = supplierName.trim() ? ` ${supplierName.trim()}` : "";
    const suffixPart = suffix ? ` ${suffix}` : "";
    return `Файл для загрузки APEX${supplierPart}${suffixPart}.xlsx`;
  };

  const handleDownload = async () => {
    try {
      // Проверяем обязательные столбцы перед началом обработки
      const validationResult = validateRequiredColumns(deliveryTimeData);
      if (!validationResult.isValid) {
        const errorMessage = "В файле отсутствуют ключевые данные";

        // Вызываем обработчик ошибки
        if (onProcessingComplete) {
          onProcessingComplete(false);
        }

        // Генерируем событие для показа ошибки через ErrorHandler
        const errorEvent = new CustomEvent("fileFormationError", {
          detail: { message: errorMessage },
        });
        window.dispatchEvent(errorEvent);
        return;
      }

      const csValues = ["R01", "R31", "R77", "R04", "R02", "R29", "R19", "V30"];
      const allData = [];

      for (let copyIndex = 0; copyIndex < 8; copyIndex++) {
        const csValue = csValues[copyIndex];
        const copyData = deliveryTimeData.map((row) => {
          const processingColumn = findProcessingColumn(row);
          let processingValue = "";

          if (processingColumn) {
            processingValue = processProcessingValue(row[processingColumn]);
          } else {
            processingValue = "!!!";
          }

          // Находим столбец "Код" с помощью улучшенной функции
          const codeColumn = findColumnByKeyword(row, "Код");

          return {
            ЦС: csValue,
            Код: codeColumn ? (row[codeColumn] ?? "") : "",
            Тип: "",
            Организация: "",
            "Предварительная обработка": "",
            Обработка: processingValue,
            "Заключительная обработка": "",
            Статус: "",
            Сообщение: "",
          };
        });

        allData.push(...copyData);
      }

      const totalRows = allData.length;

      if (!splitFilesEnabled) {
        // РЕЖИМ "НЕ РАЗБИВАТЬ ФАЙЛ" - создаем один файл
        try {
          const blob = createExcelBlob(allData, EXCEL_HEADERS, "Импортированные данные");
          const success = await downloadBlob(blob, getApexFileName());

          if (onProcessingComplete) {
            onProcessingComplete(success);
          }
        } catch (error) {
          console.error("Ошибка при создании файла:", error);
          if (onProcessingComplete) {
            onProcessingComplete(false);
          }
        }
      } else {
        // РЕЖИМ "РАЗБИВАТЬ ФАЙЛЫ" - стандартная логика (9990 строк на файл)
        const MAX_ROWS = splitRowsLimit;
        const totalParts = Math.ceil(totalRows / MAX_ROWS);

        // ИСПРАВЛЕНИЕ: Если только одна часть - используем простое название
        if (totalParts === 1) {
          // Создаем один файл без указания "часть 1 из 1"
          const blob = createExcelBlob(allData, EXCEL_HEADERS, "Импортированные данные");
          const fileName = getApexFileName();
          const success = await downloadBlob(blob, fileName);

          if (onProcessingComplete) {
            onProcessingComplete(success);
          }
        } else {
          // Если несколько частей - используем стандартную логику с указанием частей
          let allDownloadsSuccessful = true;

          for (let part = 1; part <= totalParts; part++) {
            const startIndex = (part - 1) * MAX_ROWS;
            const endIndex = Math.min(part * MAX_ROWS, totalRows);
            const partData = allData.slice(startIndex, endIndex);

            const blob = createExcelBlob(partData, EXCEL_HEADERS, "Импортированные данные");
            const fileName = getApexFileName(`(часть ${part} из ${totalParts})`);
            const success = await downloadBlob(blob, fileName);

            if (!success) {
              allDownloadsSuccessful = false;
            }

            // Небольшая задержка между скачиваниями файлов
            if (part < totalParts) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          if (onProcessingComplete) {
            onProcessingComplete(allDownloadsSuccessful);
          }
        }
      }
    } catch (error) {
      console.error("Ошибка при формировании файла:", error);
      if (onProcessingComplete) {
        onProcessingComplete(false);
      }
    }
  };

  return null;
};

export default FileFormationOne;
