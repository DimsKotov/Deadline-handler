import * as XLSX from "xlsx";

// Функция для нормализации названия столбца
const normalizeColumnName = (name: string): string => {
  if (!name) return "";
  return name.toString().trim().toLowerCase();
};

// Универсальная функция обработки значения срока
export const processProcessingValue = (value: any): string => {
  if (value === null || value === undefined || value === "") {
    return "!!!";
  }

  const strValue = value.toString().trim();

  // Если уже специальное значение-маркер, оставляем как есть
  if (strValue === "!!!") {
    return "!!!";
  }

  const numValue = parseFloat(strValue.replace(",", "."));
  if (isNaN(numValue) || numValue === 0) {
    return "!!!";
  }

  return strValue;
};

// Унифицированная функция скачивания Blob-файла
export const downloadBlob = (blob: Blob, fileName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve(true);
      }, 100);
    } catch (error) {
      console.error("Ошибка при скачивании:", error);
      resolve(false);
    }
  });
};

// Унифицированная функция создания Excel Blob по данным
export const createExcelBlob = (
  data: any[],
  headers: string[],
  sheetName: string,
  options?: { pruneEmptyCells?: boolean }
): Blob => {
  const pruneEmptyCells = options?.pruneEmptyCells ?? true;

  // Оптимизация размера: не создаем ячейки для пустых значений.
  // Пустые строки ("") сильно раздувают файл, т.к. XLSX хранит их как реальные ячейки.
  const cleanedData = pruneEmptyCells
    ? data.map((row) => {
        if (!row || typeof row !== "object") return row;
        const cleaned: any = {};
        for (const key of Object.keys(row)) {
          const value = row[key];
          if (value === "" || value === null || value === undefined) continue;
          cleaned[key] = value;
        }
        return cleaned;
      })
    : data;

  const worksheet = XLSX.utils.json_to_sheet(cleanedData, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  });

  return new Blob([excelBuffer], {
    type: "application/octet-stream",
  });
};

export const parseExcelFile = (
  file: File,
  options?: { preferredSheetName?: string },
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (typeof data === "string" || data instanceof ArrayBuffer) {
        try {
          const workbook = XLSX.read(data, {
            type: typeof data === "string" ? "string" : "array",
          });

          // Выбор листа:
          // - если передан preferredSheetName и он есть в книге — используем его
          // - иначе если есть лист "Склад ДКС" — используем его (исторически для DKC)
          // - иначе используем первый лист
          const requestedSheetName = options?.preferredSheetName;
          const defaultDkcSheetName = "Склад ДКС";

          const sheetName =
            (requestedSheetName &&
              workbook.SheetNames.includes(requestedSheetName) &&
              requestedSheetName) ||
            (workbook.SheetNames.includes(defaultDkcSheetName) &&
              defaultDkcSheetName) ||
            workbook.SheetNames[0];

          const worksheet = workbook.Sheets[sheetName];

          // Получаем диапазон ячеек
          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

          // Ищем строку с заголовками
          let headerRowIndex = -1;
          const keywords = ["артикул", "код", "цс", "срок", "категор"];

          // Вместо первого совпадения берём строку с максимальным числом ключевых попаданий,
          // что лучше работает для "сложных" файлов (данные выше заголовка, разделители и т.п.)
          let bestScore = 0;

          for (let row = range.s.r; row <= range.e.r; row++) {
            let rowScore = 0;

            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];

              if (
                cell &&
                cell.v !== undefined &&
                cell.v !== null &&
                cell.v !== ""
              ) {
                const cellValue = String(cell.v).trim().toLowerCase();
                if (keywords.some((keyword) => cellValue.includes(keyword))) {
                  rowScore++;
                }
              }
            }

            if (rowScore > bestScore) {
              bestScore = rowScore;
              headerRowIndex = row;
            }
          }

          if (headerRowIndex === -1 || bestScore === 0) {
            reject(new Error("Заголовки не найдены."));
            return;
          }

          // Собираем заголовки из всех столбцов, даже пустых
          const headers: string[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({
              r: headerRowIndex,
              c: col,
            });
            const cell = worksheet[cellAddress];
            const header =
              cell && cell.v !== undefined
                ? String(cell.v)
                : `Column_${col + 1}`;
            headers[col] = header;
          }

          // Собираем данные, начиная со строки после заголовков
          const jsonData: any[] = [];

          for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
            const rowData: any = {};
            let hasData = false;

            for (let col = range.s.c; col <= range.e.c; col++) {
              const header = headers[col];
              if (header) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];

                if (
                  cell &&
                  cell.v !== undefined &&
                  cell.v !== null &&
                  cell.v !== ""
                ) {
                  rowData[header] = cell.v;
                  hasData = true;
                } else {
                  // Даже для пустых ячеек добавляем поле
                  rowData[header] = null;
                }
              }
            }

            // Добавляем строку только если в ней есть данные
            if (hasData) {
              jsonData.push(rowData);
            }
          }

          resolve(jsonData);
        } catch (err) {
          console.error("Ошибка при парсинге Excel:", err);
          reject(new Error("Ошибка при чтении файла."));
        }
      } else {
        reject(new Error("Неверный формат данных файла."));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка при чтении файла."));
    reader.readAsArrayBuffer(file);
  });
};

// Валидация для "Данных о поставках"
export const validateDeliveryDataColumns = (jsonData: any[]): boolean => {
  if (jsonData.length === 0) return false;

  const firstRow = jsonData[0];
  const columns = Object.keys(firstRow).map((col) => normalizeColumnName(col));

  // Используем более гибкую проверку с частичным совпадением
  const hasCS = columns.some((col) => col.includes("цс"));
  const hasCode = columns.some((col) => col.includes("код"));
  const hasArticle = columns.some((col) => col.includes("артикул"));
  

  return hasCS && hasCode && hasArticle;
};

// Валидация для файла поставщика
export const validateDeliveryTimeColumns = (jsonData: any[]): boolean => {
  if (jsonData.length === 0) return false;

  const firstRow = jsonData[0];
  const columns = Object.keys(firstRow).map((col) => normalizeColumnName(col));

  // Возможные названия для столбца с артикулом/кодом
  const articleKeywords = [
    "артикул",
    "код",
    "код товара",
    "артикул поставщика",
    "артикул товара",
    "референс",
  ];

  // Возможные названия для столбца со сроком
  const deadlineKeywords = [
    "срок готовн отгр (обработка)",
    "срок",
    "сроки",
    "срок производства",
    "срок изготовления",
    "производство",
    "готовность товара",
    "срок отгрузки",
    "срок готовн",
    "срок готовн отгр",
    "срок готовности",
    "изготовление",
    "новый срок",
    "Срок готовности к отгрузке со склада Москва",
    "Срок готовности к отгрузке со склада Екатеринбург",
    "Средний срок поставки, дни"
  ];

  // Для некоторых поставщиков (например Betterman) сроки выражены категорией поставки
  const categoryKeywords = ["категория поставки"];

  // Проверяем наличие столбца с артикулом/кодом
  const hasArticleOrCode = columns.some((column) =>
    articleKeywords.some((keyword) => column.includes(keyword)),
  );

  // Проверяем наличие столбца со сроком
  const hasDeadline = columns.some((column) =>
    deadlineKeywords.some((keyword) => column.includes(keyword)),
  );

  const hasCategory = columns.some((column) =>
    categoryKeywords.some((keyword) => column.includes(keyword)),
  );

  return hasArticleOrCode && (hasDeadline || hasCategory);
};

// Дополнительная функция для поиска столбца по ключевому слову
export const findColumnByKeyword = (
  row: any,
  keyword: string,
): string | null => {
  if (!row) return null;

  const normalizedKeyword = normalizeColumnName(keyword);
  const rowKeys = Object.keys(row);

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
