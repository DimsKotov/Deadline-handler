import ExcelJS from "exceljs";

export const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const TEMPLATE_FILE_NAME = "Шаблон для загрузки окон диспетчера.xlsx";
const GOOGLE_SHEET_ID = "1AzkcQ83jOuf0WH5v0TdNFHG8CJZf6kDJ";

type SheetRuleConfig = {
  sheetName: string;
  sourceSheetName?: string;
  removeNightRowExceptMonday: boolean;
  dlInterval?: string;
  bsInterval?: string;
  pekInterval?: string;
  skipNoteMarkers?: string[];
  onlyNoteMarkers?: string[];
  fillMode?: "default" | "columnEOnly";
  kppStartCol?: string;
  kppEndCol?: string;
  defaultStartCol?: string;
  markerCol?: string;
  dlStartCol?: string;
};

const SHEET_RULES: SheetRuleConfig[] = [
  {
    sheetName: "Екатеринбург",
    removeNightRowExceptMonday: true,
  },
  {
    sheetName: "Сибирь",
    removeNightRowExceptMonday: false,
    dlInterval: "9:00-13:00",
    bsInterval: "14:00-18:00",
    pekInterval: "14:00-18:00",
  },
  {
    sheetName: "Тверь",
    removeNightRowExceptMonday: true,
    skipNoteMarkers: ["перемерки"],
  },
  {
    sheetName: "Тула",
    removeNightRowExceptMonday: true,
    skipNoteMarkers: ["перемерки"],
  },
  {
    sheetName: "Ростов",
    removeNightRowExceptMonday: true,
    skipNoteMarkers: ["перемерки"],
  },
  {
    sheetName: "Самара",
    removeNightRowExceptMonday: true,
    skipNoteMarkers: ["перемерки"],
  },
  {
    sheetName: "Москва",
    removeNightRowExceptMonday: true,
    skipNoteMarkers: ["перемерки"],
    kppStartCol: "E",
    kppEndCol: "I",
    defaultStartCol: "J",
    markerCol: "J",
    dlStartCol: "K",
  },
  {
    sheetName: "Тверь(Перемерки)",
    sourceSheetName: "Тверь",
    removeNightRowExceptMonday: true,
    onlyNoteMarkers: ["перемерки"],
    fillMode: "columnEOnly",
  },
];

type DispatcherSourceRow = {
  weekday: string;
  timeFrom: string;
  timeTo: string;
  shortName: string;
  note: string;
};

const normalizeHeader = (v: unknown): string =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeNameForMatch = (v: unknown): string =>
  normalizeHeader(v).replace(/[^a-zа-я0-9]/gi, "");

const SHEET_RULES_BY_PRIORITY = [...SHEET_RULES].sort(
  (a, b) => normalizeNameForMatch(b.sheetName).length - normalizeNameForMatch(a.sheetName).length
);

const formatDate = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
};

const formatWeekdayRu = (date: Date): string => {
  const weekdays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  return weekdays[date.getDay()];
};

const getIsoWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const hasWeekMarkNch = (note: string): boolean =>
  /(^|[^а-яa-z0-9])нч($|[^а-яa-z0-9])/i.test(note);

const hasWeekMarkCh = (note: string): boolean =>
  /(^|[^а-яa-z0-9])ч($|[^а-яa-z0-9])/i.test(note);

const parseWeekdayToJsDay = (raw: string): number | null => {
  const value = normalizeHeader(raw);
  if (!value) return null;
  if (value.includes("пон")) return 1;
  if (value.includes("втор")) return 2;
  if (value.includes("сред")) return 3;
  if (value.includes("чет")) return 4;
  if (value.includes("пят")) return 5;
  if (value.includes("суб")) return 6;
  if (value.includes("воск")) return 0;
  return null;
};

const normalizeTime = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    return `${v.getUTCHours()}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?/);
  if (!m) return s;
  return `${Number(m[1])}:${String(Number(m[2] ?? "0")).padStart(2, "0")}`;
};

const colToNumber = (col: string): number =>
  col
    .toUpperCase()
    .split("")
    .reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);

const addDays = (date: Date, days: number): Date => {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
};

const getWeekdaysOnlyDays = (year: number, monthIndex: number): Date[] => {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const days: Date[] = [];
  for (let dt = new Date(monthStart); dt <= monthEnd; dt = addDays(dt, 1)) {
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    days.push(new Date(dt));
  }
  return days;
};

const getMonthDaysFromIsDayOff = async (year: number, monthIndex: number): Promise<Date[]> => {
  const month = String(monthIndex + 1).padStart(2, "0");
  const url = `https://isdayoff.ru/api/getdata?year=${year}&month=${month}&cc=ru`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`isDayOff вернул status=${response.status}.`);

  const raw = (await response.text()).trim();
  const codes = raw.replace(/\s+/g, "");
  if (!codes || /[^0-9]/.test(codes)) throw new Error("Некорректный ответ isDayOff.");

  const monthDaysCount = new Date(year, monthIndex + 1, 0).getDate();
  if (codes.length < monthDaysCount) throw new Error("isDayOff вернул неполные данные за месяц.");

  const days: Date[] = [];
  for (let i = 0; i < monthDaysCount; i++) {
    if (codes[i] === "0" || codes[i] === "2") days.push(new Date(year, monthIndex, i + 1));
  }
  return days;
};

const getMonthDays = async (year: number, monthIndex: number, useProductionCalendar: boolean) =>
  useProductionCalendar ? getMonthDaysFromIsDayOff(year, monthIndex) : getWeekdaysOnlyDays(year, monthIndex);

const fetchDispatcherRows = async (sheetName: string): Promise<DispatcherSourceRow[]> => {
  const directUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    sheetName
  )}&tqx=out:json`;
  const proxiedUrl = `/google-sheets/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    sheetName
  )}&tqx=out:json`;

  const tryFetch = async (url: string) => {
    try {
      return await fetch(url);
    } catch {
      return null;
    }
  };

  let response: Response | null = null;
  if (import.meta.env.DEV) response = await tryFetch(proxiedUrl);
  if (!response || !response.ok) response = await tryFetch(directUrl);
  if (!response) throw new Error("Не удалось получить данные Google Sheet.");
  if (!response.ok) throw new Error(`Не удалось получить данные Google Sheet (status=${response.status}).`);

  const text = await response.text();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) throw new Error("Некорректный ответ Google Sheet API");

  const json = JSON.parse(text.slice(start, end + 1));
  const table = json?.table;
  const cols: Array<{ label?: string }> = table?.cols ?? [];
  const rows: Array<{ c?: Array<{ v?: unknown; f?: string } | null> }> = table?.rows ?? [];
  const labels = cols.map((c) => normalizeHeader(c?.label ?? ""));
  const findCol = (keyword: string): number | undefined => {
    const idx = labels.findIndex((x) => x.includes(normalizeHeader(keyword)));
    return idx >= 0 ? idx : undefined;
  };

  const weekdayCol = findCol("день недели");
  const timeFromCol = findCol("время с");
  const timeToCol = findCol("время по");
  const noteCol = findCol("примечание");
  const shortNameCol = findCol("сокращенное название") ?? findCol("сокращённое название");
  if (weekdayCol === undefined || timeFromCol === undefined || timeToCol === undefined || shortNameCol === undefined) {
    throw new Error("В Google Sheet не найдены столбцы: День недели/Время с/Время по/Сокращенное название.");
  }

  const getText = (row: { c?: Array<{ v?: unknown; f?: string } | null> }, idx: number | undefined): string => {
    if (idx === undefined) return "";
    const cell = row.c?.[idx];
    if (!cell) return "";
    return String(cell.f ?? cell.v ?? "").trim();
  };

  const out: DispatcherSourceRow[] = [];
  for (const row of rows) {
    const weekday = getText(row, weekdayCol);
    const timeFrom = normalizeTime(getText(row, timeFromCol));
    const timeTo = normalizeTime(getText(row, timeToCol));
    const shortName = getText(row, shortNameCol);
    const note = getText(row, noteCol);
    if (!weekday || !shortName) continue;
    out.push({ weekday, timeFrom, timeTo, shortName, note });
  }
  return out;
};

const findDateAndWeekdayColumnsAndHeaderRow = (
  ws: ExcelJS.Worksheet
): { dateCol: number; weekdayCol: number | null; headerRow: number } | null => {
  const maxScanRow = Math.min(Math.max(ws.rowCount, 30), 100);
  for (let r = 1; r <= maxScanRow; r++) {
    const row = ws.getRow(r)
    let dateCol = 0;
    let weekdayCol = 0;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = normalizeHeader(cell.value);
      if (key === "дата" || key.includes("дата")) dateCol = colNumber;
      if (key === "день недели" || key.includes("день недели")) weekdayCol = colNumber;
    });
    if (dateCol > 0) return { dateCol, weekdayCol: weekdayCol || null, headerRow: r };
  }
  return null;
};

const findBlockStartsByMerges = (ws: ExcelJS.Worksheet, dateCol: number, fromRow: number, toRow: number): number[] => {
  const blockStarts: number[] = [];
  for (let r = fromRow; r <= toRow; r++) {
    const cell = ws.getCell(r, dateCol);
    if (!cell.isMerged) continue;
    const master = cell.master;
    if (!master) continue;
    if (master.address !== cell.address) continue;
    blockStarts.push(r);
  }
  return blockStarts;
};

const getMergedBlockEndRow = (ws: ExcelJS.Worksheet, startRow: number, col: number): number => {
  const startCell = ws.getCell(startRow, col);
  if (!startCell.isMerged || !startCell.master) return startRow;
  const masterAddress = startCell.master.address;
  let endRow = startRow;
  for (let r = startRow + 1; r <= ws.rowCount; r++) {
    const cell = ws.getCell(r, col);
    const sameMerge = cell.isMerged && cell.master && cell.master.address === masterAddress;
    if (!sameMerge) break;
    endRow = r;
  }
  return endRow;
};

const findLastFilledDateRow = (ws: ExcelJS.Worksheet, dateCol: number, fromRow: number): number | null => {
  for (let r = ws.rowCount; r >= fromRow; r--) {
    const value = ws.getCell(r, dateCol).value;
    if (value === null || value === undefined || String(value).trim() === "") continue;
    return r;
  }
  return null;
};

const hardTrimWorksheetBottom = (ws: ExcelJS.Worksheet, lastRowToKeep: number): void => {
  if (lastRowToKeep < 1) return;
  if (lastRowToKeep < ws.rowCount) ws.spliceRows(lastRowToKeep + 1, ws.rowCount - lastRowToKeep);
  const sheetModel = ws.model as ExcelJS.WorksheetModel & { rows?: unknown[] };
  if (sheetModel.rows && sheetModel.rows.length > lastRowToKeep) sheetModel.rows = sheetModel.rows.slice(0, lastRowToKeep);
  const wsPrivate = ws as unknown as { _rows?: Array<unknown> };
  if (Array.isArray(wsPrivate._rows) && wsPrivate._rows.length > lastRowToKeep) wsPrivate._rows.length = lastRowToKeep;
  if (sheetModel.merges && sheetModel.merges.length > 0) {
    sheetModel.merges = sheetModel.merges.filter((mergeRef) => {
      const startRef = mergeRef.split(":")[0] ?? "";
      const row = Number(startRef.replace(/^[A-Z]+/i, ""));
      if (!Number.isFinite(row)) return true;
      return row <= lastRowToKeep;
    });
  }
  if (ws.pageSetup?.printArea) ws.pageSetup.printArea = undefined;
};

const removeNightRowExceptMonday = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  weekdayCol: number | null,
  openCol: number,
  closeCol: number
): void => {
  if (!weekdayCol) return;
  for (let r = endRow; r >= startRow; r--) {
    const weekday = normalizeHeader(ws.getCell(r, weekdayCol).value);
    const open = normalizeTime(ws.getCell(r, openCol).value);
    const close = normalizeTime(ws.getCell(r, closeCol).value);
    if (open === "0:00" && close === "2:00" && !weekday.includes("понедельник")) ws.spliceRows(r, 1);
  }
};

const removeEmptyCarrierRows = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  markerCol: number,
  valuesStartCol: number
): void => {
  const markerNames = ["деловые линии", "байкал сервис", "пэк"];
  for (let r = endRow; r >= startRow; r--) {
    const marker = normalizeHeader(ws.getCell(r, markerCol).value);
    if (!markerNames.some((name) => marker.includes(name))) continue;
    let hasValuesFromH = false;
    for (let c = valuesStartCol; c <= Math.max(ws.columnCount, valuesStartCol); c++) {
      const v = ws.getCell(r, c).value;
      if (v === null || v === undefined) continue;
      if (String(v).trim() === "") continue;
      hasValuesFromH = true;
      break;
    }
    if (!hasValuesFromH) ws.spliceRows(r, 1);
  }
};

const applyFillToColumnEIntervalRows = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  openCol: number,
  closeCol: number,
  fillTemplate: ExcelJS.Fill | null
): void => {
  if (!fillTemplate) return;
  const eCol = colToNumber("E");
  for (let r = startRow; r <= endRow; r++) {
    const open = normalizeTime(ws.getCell(r, openCol).value);
    const close = normalizeTime(ws.getCell(r, closeCol).value);
    if (open === "" && close === "") continue;
    ws.getCell(r, eCol).fill = JSON.parse(JSON.stringify(fillTemplate));
  }
};

const parseCellRef = (ref: string): { col: number; row: number } | null => {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  return { col: colToNumber(m[1]), row: Number(m[2]) };
};

const restoreDateWeekdayMerges = (
  ws: ExcelJS.Worksheet,
  dateCol: number,
  weekdayCol: number | null,
  fromRow: number,
  openCol: number,
  closeCol: number
): void => {
  const applyDayBlockBoldBorder = (startRow: number, endRow: number): void => {
    const bold = { style: "medium" as const };
    const leftCol = weekdayCol ?? dateCol;
    const rightCol = dateCol;
    for (let c = leftCol; c <= rightCol; c++) {
      const topCell = ws.getCell(startRow, c);
      topCell.border = { ...(topCell.border ?? {}), top: bold };
      const bottomCell = ws.getCell(endRow, c);
      bottomCell.border = { ...(bottomCell.border ?? {}), bottom: bold };
    }
  };

  const sheetModel = ws.model as ExcelJS.WorksheetModel & { merges?: string[] };
  const merges = sheetModel.merges ?? [];
  for (const mergeRef of merges) {
    const [startRef, endRef] = mergeRef.split(":");
    const start = parseCellRef(startRef ?? "");
    const end = parseCellRef(endRef ?? startRef ?? "");
    if (!start || !end) continue;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const touchesDate = dateCol >= minCol && dateCol <= maxCol;
    const touchesWeekday = weekdayCol !== null && weekdayCol >= minCol && weekdayCol <= maxCol;
    if (!touchesDate && !touchesWeekday) continue;
    try {
      ws.unMergeCells(mergeRef);
    } catch {
      // ignore
    }
  }

  let r = fromRow;
  while (r <= ws.rowCount) {
    const dateValue = String(ws.getCell(r, dateCol).value ?? "").trim();
    if (!dateValue) {
      r++;
      continue;
    }
    const weekdayValue = weekdayCol ? String(ws.getCell(r, weekdayCol).value ?? "").trim() : "";
    let end = r;
    while (end + 1 <= ws.rowCount) {
      const nextDate = String(ws.getCell(end + 1, dateCol).value ?? "").trim();
      const nextOpen = normalizeTime(ws.getCell(end + 1, openCol).value);
      const nextClose = normalizeTime(ws.getCell(end + 1, closeCol).value);
      const hasInterval = nextOpen !== "" || nextClose !== "";
      if (hasInterval && (nextDate === "" || nextDate === dateValue)) {
        end++;
        continue;
      }
      break;
    }

    ws.getCell(r, dateCol).value = dateValue;
    if (weekdayCol) ws.getCell(r, weekdayCol).value = weekdayValue;
    for (let rr = r + 1; rr <= end; rr++) {
      ws.getCell(rr, dateCol).value = null;
      if (weekdayCol) ws.getCell(rr, weekdayCol).value = null;
    }
    if (end > r) {
      ws.mergeCells(r, dateCol, end, dateCol);
      if (weekdayCol) ws.mergeCells(r, weekdayCol, end, weekdayCol);
    }
    applyDayBlockBoldBorder(r, end);
    r = end + 1;
  }
};

const restoreCarrierColumnGMerges = (ws: ExcelJS.Worksheet, fromRow: number): void => {
  const gCol = colToNumber("G");
  const sheetModel = ws.model as ExcelJS.WorksheetModel & { merges?: string[] };
  const merges = sheetModel.merges ?? [];
  for (const mergeRef of merges) {
    const [startRef, endRef] = mergeRef.split(":");
    const start = parseCellRef(startRef ?? "");
    const end = parseCellRef(endRef ?? startRef ?? "");
    if (!start || !end) continue;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    if (gCol < minCol || gCol > maxCol) continue;
    if (Math.max(start.row, end.row) < fromRow) continue;
    try {
      ws.unMergeCells(mergeRef);
    } catch {
      // ignore
    }
  }

  let r = fromRow;
  while (r <= ws.rowCount) {
    const gText = normalizeHeader(ws.getCell(r, gCol).value);
    const isDl = gText.includes("деловые линии");
    if (!isDl) {
      r++;
      continue;
    }
    let end = r;
    while (end + 1 <= ws.rowCount) {
      const next = normalizeHeader(ws.getCell(end + 1, gCol).value);
      if (next.includes("деловые линии")) {
        end++;
        continue;
      }
      // В шаблонах "Деловые Линии" часто объединены на 2 строки.
      // Если после преобразований вторая строка стала пустой — восстанавливаем merge-пару.
      if (end === r && next === "") {
        end++;
      }
      break;
    }
    if (end > r) {
      for (let rr = r + 1; rr <= end; rr++) ws.getCell(rr, gCol).value = null;
      ws.getCell(r, gCol).value = "Деловые Линии";
      ws.mergeCells(r, gCol, end, gCol);
    }
    r = end + 1;
  }
};

const findHeaderColumnInRow = (ws: ExcelJS.Worksheet, rowNumber: number, headerText: string): number | null => {
  const row = ws.getRow(rowNumber);
  const target = normalizeHeader(headerText);
  let found: number | null = null;
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = normalizeHeader(cell.value);
    if (key === target || key.includes(target)) found = colNumber;
  });
  return found;
};

const findFirstEmptyInRow = (ws: ExcelJS.Worksheet, rowNumber: number, startCol: number): number => {
  let col = startCol;
  while (col < 300) {
    const v = ws.getCell(rowNumber, col).value;
    if (v === null || v === undefined || String(v).trim() === "") return col;
    col++;
  }
  return col;
};

const findFirstEmptyInRange = (
  ws: ExcelJS.Worksheet,
  rowNumber: number,
  fromCol: number,
  toCol: number
): number | null => {
  for (let col = fromCol; col <= toCol; col++) {
    const v = ws.getCell(rowNumber, col).value;
    if (v === null || v === undefined || String(v).trim() === "") return col;
  }
  return null;
};

const writeSupplierCell = (ws: ExcelJS.Worksheet, rowNumber: number, colNumber: number, value: string): void => {
  const cell = ws.getCell(rowNumber, colNumber);
  cell.value = value.replace(/_/g, " ");
  cell.font = { ...(cell.font ?? {}), underline: false };
  cell.alignment = { ...(cell.alignment ?? {}), horizontal: "center", vertical: "middle" };
};

const createDispatcherWindowsBlob = async (
  sourceRowsBySheet: Record<string, DispatcherSourceRow[]>,
  year: number,
  monthIndex: number,
  useProductionCalendar: boolean
): Promise<Blob> => {
  const templateUrl = `${import.meta.env.BASE_URL}template/${encodeURIComponent(TEMPLATE_FILE_NAME)}`;
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error(`Не удалось загрузить шаблон '${TEMPLATE_FILE_NAME}'.`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await response.arrayBuffer());
  const tverReferenceFill =
    wb.getWorksheet("Тверь")?.getCell(2, colToNumber("E")).fill ?? null;
  const days = await getMonthDays(year, monthIndex, useProductionCalendar);
  if (days.length === 0) throw new Error("Для выбранного периода нет дат для заполнения.");

  for (const ws of wb.worksheets) {
    const wsNameNorm = normalizeNameForMatch(ws.name);
    const sheetConfig = SHEET_RULES_BY_PRIORITY.find((cfg) =>
      wsNameNorm.includes(normalizeNameForMatch(cfg.sheetName))
    );
    if (!sheetConfig) continue;
    const sourceRows = sourceRowsBySheet[sheetConfig.sourceSheetName ?? sheetConfig.sheetName] ?? [];

    const rowsByWeekday = new Map<number, DispatcherSourceRow[]>();
    for (const row of sourceRows) {
      const jsDay = parseWeekdayToJsDay(row.weekday);
      if (jsDay === null) continue;
      const list = rowsByWeekday.get(jsDay);
      if (list) list.push(row);
      else rowsByWeekday.set(jsDay, [row]);
    }

    const found = findDateAndWeekdayColumnsAndHeaderRow(ws);
    if (!found) continue;
    const openCol = findHeaderColumnInRow(ws, found.headerRow, "время откр окна");
    const closeCol = findHeaderColumnInRow(ws, found.headerRow, "время закр окна");
    if (!openCol || !closeCol) throw new Error("В шаблоне не найдены столбцы 'Время откр окна' и 'Время закр окна'.");

    const fromRow = found.headerRow + 1;
    const peremerkiFillTemplate =
      sheetConfig.fillMode === "columnEOnly"
        ? JSON.parse(
            JSON.stringify(
              tverReferenceFill ?? ws.getCell(fromRow, colToNumber("E")).fill ?? null
            )
          )
        : null;
    const toRow = Math.max(ws.rowCount, fromRow + days.length * 12 + 24);
    const blockStarts = findBlockStartsByMerges(ws, found.dateCol, fromRow, toRow);
    if (blockStarts.length === 0) continue;

    const filledBlocksCount = Math.min(days.length, blockStarts.length);
    for (let i = 0; i < filledBlocksCount; i++) {
      const day = days[i];
      const blockStart = blockStarts[i];
      const blockEnd = i + 1 < blockStarts.length ? blockStarts[i + 1] - 1 : ws.rowCount;
      ws.getCell(blockStart, found.dateCol).value = formatDate(day);
      if (found.weekdayCol) ws.getCell(blockStart, found.weekdayCol).value = formatWeekdayRu(day);

      const dayRows = rowsByWeekday.get(day.getDay()) || [];
      const isEvenWeek = getIsoWeekNumber(day) % 2 === 0;
      for (const src of dayRows) {
        const supplier = src.shortName.trim();
        if (!supplier) continue;
        const intervalFrom = normalizeTime(src.timeFrom);
        const intervalTo = normalizeTime(src.timeTo);
        const note = normalizeHeader(src.note);

        if (
          sheetConfig.onlyNoteMarkers &&
          !sheetConfig.onlyNoteMarkers.some((marker) => note.includes(normalizeHeader(marker)))
        ) {
          continue;
        }

        if (sheetConfig.skipNoteMarkers?.some((marker) => note.includes(normalizeHeader(marker)))) {
          continue;
        }

        // НЧ -> только нечетная неделя, Ч -> только четная неделя.
        if (hasWeekMarkNch(note) && isEvenWeek) continue;
        if (!hasWeekMarkNch(note) && hasWeekMarkCh(note) && !isEvenWeek) continue;

        let intervalRow: number | null = null;
        for (let r = blockStart; r <= blockEnd; r++) {
          const open = normalizeTime(ws.getCell(r, openCol).value);
          const close = normalizeTime(ws.getCell(r, closeCol).value);
          if (open === intervalFrom && close === intervalTo) {
            intervalRow = r;
            break;
          }
        }
        if (!intervalRow) continue;

        if (sheetConfig.fillMode === "columnEOnly") {
          const targetCol = colToNumber("E");
          const existing = String(ws.getCell(intervalRow, targetCol).value ?? "").trim();
          if (!existing) {
            writeSupplierCell(ws, intervalRow, targetCol, supplier);
          } else if (!existing.includes(supplier)) {
            writeSupplierCell(ws, intervalRow, targetCol, `${existing}; ${supplier}`);
          }
          if (peremerkiFillTemplate) {
            ws.getCell(intervalRow, targetCol).fill = JSON.parse(JSON.stringify(peremerkiFillTemplate));
          }
          continue;
        }

        const kppStartCol = colToNumber(sheetConfig.kppStartCol ?? "E");
        const kppEndCol = colToNumber(sheetConfig.kppEndCol ?? "F");
        const defaultStartCol = colToNumber(sheetConfig.defaultStartCol ?? "G");
        const markerCol = colToNumber(sheetConfig.markerCol ?? "G");
        const dlStartColCfg = colToNumber(sheetConfig.dlStartCol ?? "H");
        const markerWriteStartCol = Math.max(defaultStartCol, markerCol + 1);

        if (note.includes("кпп")) {
          const targetCol = findFirstEmptyInRow(ws, intervalRow, kppStartCol);
          if (targetCol <= kppEndCol) {
            writeSupplierCell(ws, intervalRow, targetCol, supplier);
          }
          continue;
        }

        if (note.includes("дл") || note.includes("бс") || note.includes("пэк")) {
          const marker = note.includes("дл") ? "деловые линии" : note.includes("бс") ? "байкал сервис" : "пэк";

          if (
            (note.includes("дл") && sheetConfig.dlInterval && `${intervalFrom}-${intervalTo}` !== sheetConfig.dlInterval) ||
            (note.includes("бс") && sheetConfig.bsInterval && `${intervalFrom}-${intervalTo}` !== sheetConfig.bsInterval) ||
            (note.includes("пэк") && sheetConfig.pekInterval && `${intervalFrom}-${intervalTo}` !== sheetConfig.pekInterval)
          ) {
            continue;
          }

          let markerRow: number | null = null;
          for (let r = blockStart; r <= blockEnd; r++) {
            const gText = normalizeHeader(ws.getCell(r, markerCol).value);
            if (gText.includes(marker)) {
              markerRow = r;
              break;
            }
          }
          if (!markerRow) continue;

          if (note.includes("дл")) {
            const dlStartCol = Math.max(dlStartColCfg, markerCol + 1);
            const firstRowLimit = 10;
            const firstRowEndCol = dlStartCol + firstRowLimit - 1;
            const firstRowCol = findFirstEmptyInRange(ws, markerRow, dlStartCol, firstRowEndCol);
            if (firstRowCol !== null) {
              writeSupplierCell(ws, markerRow, firstRowCol, supplier);
            } else {
              const targetCol = findFirstEmptyInRow(ws, markerRow + 1, dlStartCol);
              writeSupplierCell(ws, markerRow + 1, targetCol, supplier);
            }
            continue;
          }

          const targetCol = findFirstEmptyInRow(ws, markerRow, markerWriteStartCol);
          writeSupplierCell(ws, markerRow, targetCol, supplier);
          continue;
        }

        const targetCol = findFirstEmptyInRow(ws, intervalRow, defaultStartCol);
        writeSupplierCell(ws, intervalRow, targetCol, supplier);
      }
    }

    const lastFilledDateRow = findLastFilledDateRow(ws, found.dateCol, fromRow);
    if (!lastFilledDateRow) continue;
    const lastRowToKeep = getMergedBlockEndRow(ws, lastFilledDateRow, found.dateCol);
    hardTrimWorksheetBottom(ws, lastRowToKeep);
    if (sheetConfig.fillMode === "columnEOnly") {
      applyFillToColumnEIntervalRows(
        ws,
        fromRow,
        Math.min(lastRowToKeep, ws.rowCount),
        openCol,
        closeCol,
        peremerkiFillTemplate
      );
    }
    if (sheetConfig.removeNightRowExceptMonday) {
      removeNightRowExceptMonday(ws, fromRow, lastRowToKeep, found.weekdayCol, openCol, closeCol);
    }
    const markerCol = colToNumber(sheetConfig.markerCol ?? "G");
    const valuesStartCol = Math.max(colToNumber(sheetConfig.defaultStartCol ?? "G"), markerCol + 1);
    removeEmptyCarrierRows(ws, fromRow, Math.min(lastRowToKeep, ws.rowCount), markerCol, valuesStartCol);
    restoreDateWeekdayMerges(ws, found.dateCol, found.weekdayCol, fromRow, openCol, closeCol);
    restoreCarrierColumnGMerges(ws, fromRow);
    ws.views = [{ state: "normal", activeCell: "A1" } as ExcelJS.WorksheetView];
  }

  const out = await wb.xlsx.writeBuffer();
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};

export const buildDispatcherWindowsBlob = async (
  year: number,
  monthIndex: number,
  useProductionCalendar: boolean
): Promise<Blob> => {
  const sourceRowsBySheet: Record<string, DispatcherSourceRow[]> = {};
  const sourceSheetNames = Array.from(
    new Set(SHEET_RULES.map((cfg) => cfg.sourceSheetName ?? cfg.sheetName))
  );
  for (const sheetName of sourceSheetNames) {
    sourceRowsBySheet[sheetName] = await fetchDispatcherRows(sheetName);
  }
  return createDispatcherWindowsBlob(sourceRowsBySheet, year, monthIndex, useProductionCalendar);
};
