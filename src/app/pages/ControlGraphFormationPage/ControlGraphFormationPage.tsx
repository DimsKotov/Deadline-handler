import { useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { downloadBlob } from "../../../utils/ExcelUtils";
import Loader from "../../../features/Loader/Loader";
import Holidays from "date-holidays";
import styles from "./ControlGraphFormationPage.module.css";

const monthNames = [
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

type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

type ControlGraphRow = {
  cs: string;
  timeFrom: string;
  timeTo: string;
  supplier: string;
  weekday: string;
};

const GOOGLE_SHEET_ID = "1AzkcQ83jOuf0WH5v0TdNFHG8CJZf6kDJ";
// Вкладки, которые нужно последовательно подставить в формируемый файл.
const GOOGLE_SHEET_TABS = [
  "Тверь",
  "Тула",
  "Москва",
  "Ростов",
  "Самара",
  "Екатеринбург",
  "Сибирь",
] as const;

const ruHolidays = new Holidays("RU");

const normalizeHeader = (v: unknown): string =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const formatDate = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
};

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

const addDays = (date: Date, days: number): Date => {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
};

const fetchSheetRows = async (sheetName: string): Promise<ControlGraphRow[]> => {
  // gviz возвращает JSONP-обертку; парсим JSON вручную.
  // Идём через sheet=<название вкладки>, т.к. gid для разных вкладок может отличаться.
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

  const response = (await tryFetch(proxiedUrl)) ?? (await tryFetch(directUrl));

  if (!response) {
    throw new Error(
      "Не удалось получить данные Google Sheet из браузера (CORS/redirect). " +
        `Проверьте, что вкладка '${sheetName}' опубликована и доступна без логина ` +
        "(например: 'Доступ для всех, у кого есть ссылка/публично в интернете')."
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Google Sheet вернул 401 Unauthorized. Проверьте, что таблица доступна без логина (опубликована), либо что пользователь авторизован в Google."
      );
    }
    throw new Error(`Не удалось получить данные Google Sheet (status=${response.status})`);
  }

  const text = await response.text();
  if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
    throw new Error(
      "Google Sheets редиректит на страницу входа (таблица, вероятно, не опубликована/доступ требует логина). " +
        `Сделайте вкладку '${sheetName}' доступной для всех, у кого есть ссылка, или публично.`
    );
  }
  if (text.includes("<!DOCTYPE") && text.includes("401")) {
    throw new Error(
      "Google Sheet вернул HTML вместо данных (похоже на ошибку доступа). Проверьте публикацию/доступ к листу."
    );
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Некорректный ответ Google Sheet API");
  }
  const json = JSON.parse(text.slice(start, end + 1));
  const table = json?.table;
  const cols: Array<{ label?: string }> = table?.cols ?? [];
  const rows: Array<{ c?: Array<{ v?: any; f?: string } | null> }> = table?.rows ?? [];

  const normalizedColLabels = cols.map((c) => normalizeHeader(c?.label ?? ""));

  const findColIndexByKeyword = (keyword: string): number | undefined => {
    const nk = normalizeHeader(keyword);
    if (!nk) return undefined;
    // Ищем первое вхождение по смыслу, чтобы отрабатывать варианты с доп. словами/пробелами.
    const idx = normalizedColLabels.findIndex((lbl) => lbl.includes(nk));
    return idx >= 0 ? idx : undefined;
  };

  // Для разных вкладок столбец с ЦС может называться по-разному:
  // - "ЦС" (Тверь и др.)
  // - "М" (например, Екатеринбург)
  // Столбец ЦС в листах должен называться "ЦС" (ошибка "м" была исправлена в Google таблице).
  const csCol = findColIndexByKeyword("цс");
  const timeFromCol = findColIndexByKeyword("время с");
  const timeToCol = findColIndexByKeyword("время по");
  const supplierCol = findColIndexByKeyword("поставщик");
  
  const weekdayCol =
    findColIndexByKeyword("день недели") ??
    findColIndexByKeyword("дата") ??
    findColIndexByKeyword("день");

  if (
    csCol === undefined ||
    timeFromCol === undefined ||
    timeToCol === undefined ||
    supplierCol === undefined ||
    weekdayCol === undefined
  ) {
    throw new Error(
      `В листе '${sheetName}' не найдены нужные столбцы. ` +
        `Пришли колонки (норм.): ${normalizedColLabels.filter(Boolean).join(", ")}.`
    );
  }

  const getCellText = (row: { c?: Array<{ v?: any; f?: string } | null> }, index: number): string => {
    const cell = row.c?.[index];
    if (!cell) return "";
    const value = cell.f ?? cell.v;
    return String(value ?? "").trim();
  };

  const out: ControlGraphRow[] = [];
  for (const row of rows) {
    const cs = getCellText(row, csCol);
    const timeFrom = getCellText(row, timeFromCol);
    const timeTo = getCellText(row, timeToCol);
    const supplier = getCellText(row, supplierCol);
    const weekday = getCellText(row, weekdayCol);

    const hasAny = [cs, timeFrom, timeTo, supplier, weekday].some((v) => !!v);
    if (!hasAny) continue;

    out.push({ cs, timeFrom, timeTo, supplier, weekday });
  }

  return out;
};

const createControlGraphBlobFromTemplate = async (
  rowsBySheets: ControlGraphRow[][],
  year: number,
  monthIndex: number,
  useProductionCalendar: boolean
): Promise<Blob> => {
  const templateUrl = `${import.meta.env.BASE_URL}template/${encodeURIComponent("Окна визуальные.xlsx")}`;
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить шаблон 'Окна визуальные.xlsx' (status=${response.status})`);
  }

  const templateBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("В шаблоне не найден лист");

  const expectedHeaders = ["ЦС", "Время с", "Время по", "Поставщик", "Дата"];
  const headerMap = new Map<string, string>();
  expectedHeaders.forEach((h) => headerMap.set(normalizeHeader(h), h));

  const scanMaxRows = Math.min(ws.rowCount || 50, 30);
  let headerRowNumber: number | null = null;
  const colMap = new Map<string, number>();

  for (let r = 1; r <= scanMaxRows; r++) {
    const candidate = new Map<string, number>();
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = String(cell.value ?? "");
      const key = normalizeHeader(text);
      const header = headerMap.get(key);
      if (header) candidate.set(header, colNumber);
    });

    if (candidate.size >= 3 && candidate.has("ЦС")) {
      headerRowNumber = r;
      colMap.clear();
      candidate.forEach((v, k) => colMap.set(k, v));
      break;
    }
  }

  if (!headerRowNumber || colMap.size === 0) {
    throw new Error("В шаблоне не найдены заголовки: ЦС/Время с/Время по/Поставщик/Дата");
  }

  const startRow = headerRowNumber + 1;
  const styleRow = startRow;
  const outWb = new ExcelJS.Workbook();
  const outWs = outWb.addWorksheet(ws.name);

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0); // последний день месяца

  const colsArr = Array.from(colMap.values());
  const minCol = Math.min(...colsArr);
  const maxCol = Math.max(...colsArr);

  for (let col = minCol; col <= maxCol; col++) {
    const srcCol = ws.getColumn(col);
    const dstCol = outWs.getColumn(col);
    if (srcCol?.width) dstCol.width = srcCol.width;
  }

  for (let col = minCol; col <= maxCol; col++) {
    const srcCell = ws.getCell(headerRowNumber, col);
    if (srcCell?.style) {
      outWs.getCell(headerRowNumber, col).style = JSON.parse(JSON.stringify(srcCell.style));
    }
    if (srcCell?.value !== null && srcCell?.value !== undefined) {
      outWs.getCell(headerRowNumber, col).value = srcCell.value as any;
    }
  }

  // Формируем строки блоками по вкладкам Google Sheet.
  // Для каждой вкладки:
  // - перебираем все даты выбранного месяца
  // - для каждой даты подставляем строки с совпадающим днём недели
  // Блоки идут друг за другом в порядке массива rowsBySheets.
  let globalRowIndex = 0;

  for (const sheetRows of rowsBySheets) {
    const rowsByJsDay = new Map<number, ControlGraphRow[]>();

    for (const row of sheetRows) {
      const jsDay = parseWeekdayToJsDay(row.weekday);
      if (jsDay === null) continue;
      const list = rowsByJsDay.get(jsDay);
      if (list) list.push(row);
      else rowsByJsDay.set(jsDay, [row]);
    }

    // Важно: используем отдельную переменную dt, не переиспользуем monthStart/monthEnd.
    for (let dt = new Date(monthStart); dt <= monthEnd; dt = addDays(dt, 1)) {
      if (useProductionCalendar) {
        const dayOfWeek = dt.getDay(); // 0..6
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) continue;
        // date-holidays возвращает список праздников/нерабочих дней
        const holidays = ruHolidays.isHoliday(dt);
        if (holidays && holidays.length > 0) continue;
      }

      const jsDay = dt.getDay(); // 0..6 (воскресенье..суббота)
      const dayRows = rowsByJsDay.get(jsDay) || [];

      for (const row of dayRows) {
        const targetRow = startRow + globalRowIndex;
        globalRowIndex++;

        const valuesByHeader: Record<string, string> = {
          "ЦС": row.cs,
          "Время с": row.timeFrom,
          "Время по": row.timeTo,
          Поставщик: row.supplier,
          Дата: formatDate(dt),
        };

        for (const header of expectedHeaders) {
          const col = colMap.get(header);
          if (!col) continue;

          const srcCell = ws.getCell(styleRow, col);
          if (srcCell?.style) {
            outWs.getCell(targetRow, col).style = JSON.parse(JSON.stringify(srcCell.style));
          }

          const val = valuesByHeader[header];
          if (val === "" || val === null || val === undefined) continue;
          outWs.getCell(targetRow, col).value = val;
        }
      }
    }
  }

  const outBuffer = await outWb.xlsx.writeBuffer();
  return new Blob([outBuffer], { type: "application/octet-stream" });
};

function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Иногда клик по пункту может также затронуть trigger (например, при наложении/фокусе).
  // Чтобы trigger не открыл dropdown заново после выбора — подавляем обработчик trigger.
  const suppressTriggerRef = useRef(false);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  // После выбора значения (когда value обновился извне/внутри) закрываем меню.
  // Это устраняет кейсы, когда пункт не закрывает dropdown из-за особенностей событий/фокуса.
  useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const target = event.target as Node;
      if (!el.contains(target)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.dropdown} ref={rootRef}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={() => {
          if (suppressTriggerRef.current) {
            suppressTriggerRef.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        aria-expanded={open}
      >
        <span className={styles.dropdownValue}>{selected?.label ?? ""}</span>
        <span className={`${styles.dropdownArrow} ${open ? styles.dropdownArrowOpen : ""}`} />
      </button>

      {open && (
        <div className={styles.dropdownMenu} role="listbox">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              className={styles.dropdownOption}
              onClick={() => {
                suppressTriggerRef.current = true;
                onChange(opt.value);
                setOpen(false);
                // Сбрасываем подавление сразу после текущего тика.
                window.setTimeout(() => {
                  suppressTriggerRef.current = false;
                }, 0);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ControlGraphFormationPage() {
  // Текущие значения по умолчанию
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // Делаем список лет небольшой "полкой".
  const years = useMemo(() => {
    const from = currentYear;
    const to = currentYear + 10;
    const out: number[] = [];
    for (let y = from; y <= to; y++) out.push(y);
    return out;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localError, setLocalError] = useState<string>("");
  const [useProductionCalendar, setUseProductionCalendar] = useState<boolean>(true);

  const yearOptions: DropdownOption<number>[] = useMemo(
    () => years.map((y) => ({ value: y, label: String(y) })),
    [years]
  );

  const monthOptions: DropdownOption<number>[] = useMemo(
    () => monthNames.map((m, idx) => ({ value: idx, label: m })),
    []
  );

  const handleGenerateControlData = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setLocalError("");
    try {
      const rowsBySheets: ControlGraphRow[][] = [];
      let totalRows = 0;

      // Важно: сначала читаем вкладку "Тверь", затем "Тула", "Москва", ...
      for (const tabName of GOOGLE_SHEET_TABS) {
        const sheetRows = await fetchSheetRows(tabName);
        rowsBySheets.push(sheetRows);
        totalRows += sheetRows.length;
      }

      if (totalRows === 0) {
        setLocalError("В выбранных вкладках Google Sheet нет данных для формирования файла.");
        return;
      }

      const blob = await createControlGraphBlobFromTemplate(
        rowsBySheets,
        selectedYear,
        selectedMonth,
        useProductionCalendar
      );
      const fileName = `Окна контроля (${monthNames[selectedMonth]} ${selectedYear}).xlsx`;
      await downloadBlob(blob, fileName);
    } catch (error) {
      console.error(error);
      setLocalError(
        error instanceof Error ? error.message : "Ошибка при формировании файла контроля."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Год</span>
          <Dropdown<number>
            value={selectedYear}
            options={yearOptions}
            onChange={(v) => setSelectedYear(v)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Месяц</span>
          <Dropdown<number>
            value={selectedMonth}
            options={monthOptions}
            onChange={(v) => setSelectedMonth(v)}
          />
        </label>
      </div>      
      <div className={styles.productionSwitch}>
        <div className={styles.productionLabelContainer}>
          <span className={styles.productionLabel}>Использовать производственный календарь</span>
        </div>
        <button
          type="button"
          className={`${styles.productionSwitchButton} ${
            useProductionCalendar ? styles.productionSwitchEnabled : styles.productionSwitchDisabled
          }`}
          aria-pressed={useProductionCalendar}
          onClick={() => setUseProductionCalendar((v) => !v)}
        >
          <div className={styles.productionSwitchTrack}>
            <div className={styles.productionSwitchThumb} />
          </div>
        </button>
      </div>
      {isGenerating ? (
        <div className={styles.loaderContainer}>
          <Loader text="Формирую файл..." />
        </div>
      ) : (
        <button
          className={styles.uploadButton}
          type="button"
          onClick={handleGenerateControlData}
        >
          Сформировать данные контроля
        </button>
      )}

      {localError && <div className={styles.localError}>{localError}</div>}
    </div>
  );
}

