import * as XLSX from "xlsx";

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (typeof data === "string" || data instanceof ArrayBuffer) {
        try {
          const workbook = XLSX.read(data, {
            type: typeof data === "string" ? "string" : "array",
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          });

          // Ищем первую строку, содержащую хотя бы одно ключевое слово
          let headerRowIndex = -1;
          const keywords = ["артикул", "код", "цс", "срок"];

          for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i];
            // Проверяем, содержит ли строка хотя бы один непустой элемент
            if (
              row.some(
                (cell) => cell !== null && cell !== undefined && cell !== "",
              )
            ) {
              // Обрабатываем каждую ячейку в строке
              const cells = row.map((cell) =>
                cell !== null && cell !== undefined
                  ? String(cell).trim().toLowerCase()
                  : "",
              );
              // Проверяем наличие ключевых слов в отдельных ячейках
              if (
                cells.some((cell) =>
                  keywords.some((keyword) => cell.includes(keyword)),
                )
              ) {
                headerRowIndex = i;
                break;
              }
            }
          }

          if (headerRowIndex === -1) {
            // Не нашли строку с заголовками
            reject(new Error("Заголовки не найдены."));
            return;
          }

          // Парсим данные, начиная со строки после заголовков
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: sheetData[headerRowIndex],
            range: headerRowIndex + 1,
          });

          resolve(jsonData);
        } catch (err) {
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
  const columns = Object.keys(jsonData[0]).map((col) => col.toLowerCase());

  const hasCS = columns.some((col) => col.includes("цс"));
  const hasCode = columns.some((col) => col.includes("код"));
  const hasArticle = columns.some((col) => col.includes("артикул"));

  return hasCS && hasCode && hasArticle;
};

// Валидация для "Сроков поставки"
export const validateDeliveryTimeColumns = (jsonData: any[]): boolean => {
  if (jsonData.length === 0) return false;
  const columns = Object.keys(jsonData[0]).map((col) => col.toLowerCase());

  const hasArticulOrCode = columns.some(
    (col) => col.includes("артикул") || col.includes("код"),
  );
  const hasSrok = columns.some((col) => col.includes("срок"));
  const hasCSColumn = columns.some((col) => col === "цс");

  if (hasCSColumn) {
    return false;
  }

  return hasArticulOrCode && hasSrok;
};
