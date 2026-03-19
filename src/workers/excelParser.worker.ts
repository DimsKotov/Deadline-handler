import * as XLSX from "xlsx";

type ParseRequest = {
  buffer: ArrayBuffer;
  preferredSheetName?: string;
};

const parseWorkbookToJson = (
  workbook: XLSX.WorkBook,
  preferredSheetName?: string,
): any[] => {
  const defaultDkcSheetName = "Склад ДКС";
  const sheetName =
    (preferredSheetName &&
      workbook.SheetNames.includes(preferredSheetName) &&
      preferredSheetName) ||
    (workbook.SheetNames.includes(defaultDkcSheetName) && defaultDkcSheetName) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  let headerRowIndex = -1;
  let bestScore = 0;
  const keywords = ["артикул", "код", "цс", "срок", "категор"];

  for (let row = range.s.r; row <= range.e.r; row++) {
    let rowScore = 0;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
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
    throw new Error("Заголовки не найдены.");
  }

  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    const cell = worksheet[cellAddress];
    headers[col] = cell && cell.v !== undefined ? String(cell.v) : `Column_${col + 1}`;
  }

  const jsonData: any[] = [];
  for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
    const rowData: any = {};
    let hasData = false;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const header = headers[col];
      if (!header) continue;
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        rowData[header] = cell.v;
        hasData = true;
      } else {
        rowData[header] = null;
      }
    }
    if (hasData) jsonData.push(rowData);
  }
  return jsonData;
};

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  try {
    const { buffer, preferredSheetName } = event.data;
    const workbook = XLSX.read(buffer, { type: "array" });
    const data = parseWorkbookToJson(workbook, preferredSheetName);
    self.postMessage({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка при чтении файла.";
    self.postMessage({ success: false, error: message });
  }
};
