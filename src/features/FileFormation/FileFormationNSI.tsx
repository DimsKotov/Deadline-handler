import React, { useEffect, useRef } from "react";
import JSZip from "jszip";
import { downloadBlob, processProcessingValue } from "../../utils/ExcelUtils";
import {
  buildBettermanAllData,
  buildDkc1100AllData,
  buildDkc1200AllData,
  buildExclusionAllData,
  buildStandardAllData,
} from "./FileFormationService";

interface FileFormationNSIProps {
  deliveryTimeData: any[];
  deliveryData: any[];
  deliveryTimeFileName?: string | null;
  deliveryTimeSources?: Array<{ name: string; data: any[] }>;
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
  supplierName?: string;
}

type OutputRow = {
  ЦС: string;
  Код: string;
  Обработка: string;
};

const HEADER_SCAN_COLUMNS_LIMIT = 256;

const FileFormationNSI: React.FC<FileFormationNSIProps> = ({
  deliveryTimeData,
  deliveryData,
  deliveryTimeFileName = null,
  deliveryTimeSources = [],
  downloadTrigger,
  onProcessingComplete,
  supplierName = "",
}) => {
  const getNsiFileName = () => {
    const supplierPart = supplierName.trim() ? ` ${supplierName.trim()}` : "";
    return `Файл для НСИ${supplierPart}.xlsx`;
  };

  const hasDownloadedRef = useRef(false);
  const lastTriggerRef = useRef(downloadTrigger);

  useEffect(() => {
    if (downloadTrigger !== lastTriggerRef.current) {
      hasDownloadedRef.current = false;
      lastTriggerRef.current = downloadTrigger;
    }

    const hasTimeData =
      (deliveryTimeData && deliveryTimeData.length > 0) ||
      (deliveryTimeSources && deliveryTimeSources.some((s) => s.data && s.data.length > 0));

    if (hasTimeData && !hasDownloadedRef.current) {
      hasDownloadedRef.current = true;
      setTimeout(() => {
        handleDownload();
      }, 100);
    }
  }, [deliveryTimeData, deliveryData, deliveryTimeSources, downloadTrigger, deliveryTimeFileName]);

  const normalizeColumnName = (name: string): string => {
    if (!name) return "";
    return name.toString().trim().toLowerCase();
  };

  const normalizeValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    return value.toString().trim();
  };

  const findColumnByKeyword = (row: any, keyword: string): string | null => {
    const rowKeys = Object.keys(row || {});
    const normalizedKeyword = normalizeColumnName(keyword);
    for (const rowKey of rowKeys) {
      if (normalizeColumnName(rowKey) === normalizedKeyword) return rowKey;
    }
    for (const rowKey of rowKeys) {
      if (normalizeColumnName(rowKey).includes(normalizedKeyword)) return rowKey;
    }
    return null;
  };

  const findProcessingColumn = (row: any): string | null => {
    const rowKeys = Object.keys(row || {});
    for (const rowKey of rowKeys) {
      const key = normalizeColumnName(rowKey);
      if (
        key.includes("срок") ||
        key.includes("готовн") ||
        key.includes("производство") ||
        key.includes("изготовление")
      ) {
        return rowKey;
      }
    }
    return null;
  };

  const buildOneFileAllData = (): OutputRow[] => {
    if (!deliveryTimeData || deliveryTimeData.length === 0) return [];
    const csValues = ["R01", "R31", "R77", "R04", "R02", "R29", "R19", "V30"];
    const allData: OutputRow[] = [];

    for (const csValue of csValues) {
      for (const row of deliveryTimeData) {
        const codeColumn = findColumnByKeyword(row, "Код");
        const processingColumn = findProcessingColumn(row);
        const processingValue = processingColumn
          ? processProcessingValue(row[processingColumn])
          : "!!!";
        allData.push({
          ЦС: csValue,
          Код: codeColumn ? normalizeValue(row[codeColumn]) : "",
          Обработка: processingValue,
        });
      }
    }
    return allData;
  };

  const checkForSpecialColumns = (data: any[]): { moscow: boolean; ekaterinburg: boolean } => {
    if (!data || data.length === 0) return { moscow: false, ekaterinburg: false };
    const rowKeys = Object.keys(data[0]);
    let moscowFound = false;
    let ekaterinburgFound = false;

    for (const key of rowKeys) {
      const normalizedKey = normalizeColumnName(key);
      if (
        normalizedKey.includes("москва") &&
        (normalizedKey.includes("срок") || normalizedKey.includes("отгрузк"))
      ) {
        moscowFound = true;
      }
      if (
        (normalizedKey.includes("екатеринбург") || normalizedKey.includes("екб")) &&
        (normalizedKey.includes("срок") || normalizedKey.includes("отгрузк"))
      ) {
        ekaterinburgFound = true;
      }
    }
    return { moscow: moscowFound, ekaterinburg: ekaterinburgFound };
  };

  const pickSource = (needle: string): any[] | null => {
    const n = needle.toLowerCase();
    const found = deliveryTimeSources.find((s) => (s.name || "").toLowerCase().includes(n));
    return found?.data ?? null;
  };

  const buildTwoFileAllData = (): OutputRow[] => {
    const lowerName = (deliveryTimeFileName || "").toLowerCase();
    const isDkc1100 = lowerName.includes("dkc maga del 1100");
    const isDkc1200 = lowerName.includes("dkc maga del 1200");

    if (isDkc1100 && isDkc1200) {
      const dt1200 = pickSource("dkc maga del 1200") ?? deliveryTimeData;
      const dt1100 = pickSource("dkc maga del 1100") ?? deliveryTimeData;
      const data1200 = buildDkc1200AllData(dt1200, deliveryData);
      const data1100 = buildDkc1100AllData(dt1100, deliveryData);
      return [...data1100, ...data1200];
    }
    if (isDkc1200) {
      const dt1200 = pickSource("dkc maga del 1200") ?? deliveryTimeData;
      return buildDkc1200AllData(dt1200, deliveryData);
    }
    if (isDkc1100) {
      const dt1100 = pickSource("dkc maga del 1100") ?? deliveryTimeData;
      return buildDkc1100AllData(dt1100, deliveryData);
    }
    if (lowerName.includes("betterman") || lowerName.includes("беттерман")) {
      return buildBettermanAllData(deliveryTimeData, deliveryData);
    }

    const specialColumns = checkForSpecialColumns(deliveryTimeData);
    if (specialColumns.moscow || specialColumns.ekaterinburg) {
      return buildExclusionAllData(deliveryTimeData, deliveryData);
    }
    return buildStandardAllData(deliveryTimeData, deliveryData);
  };

  const buildOutputData = (): OutputRow[] => {
    const rawData =
      deliveryData && deliveryData.length > 0 ? buildTwoFileAllData() : buildOneFileAllData();
    const output = rawData.map((row) => ({
      ...row,
      Обработка: row.Обработка === "!!!" ? "По запросу" : row.Обработка,
    }));
    // Сохраняем метаданные из билдера (например, excludedAll) для обработки "нет изменений"
    (output as any).__meta = (rawData as any).__meta;
    return output;
  };

  const sanitizeForExcelXml = (value: unknown): string => {
    const str = String(value ?? "");
    return str.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, "");
  };

  const colToLetters = (col: number): string => {
    let n = col;
    let out = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  };

  const lettersToCol = (letters: string): number => {
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    return col;
  };

  const parseCellRef = (ref: string): { col: number; row: number } => {
    const match = /^([A-Z]+)(\d+)$/i.exec(ref);
    if (!match) return { col: 1, row: 1 };
    return { col: lettersToCol(match[1].toUpperCase()), row: Number(match[2]) };
  };

  const findChildByLocalName = (parent: Element, localName: string): Element | null => {
    const children = Array.from(parent.children);
    return children.find((c) => c.localName === localName) ?? null;
  };

  const getCellText = (cell: Element, sharedStrings: string[]): string => {
    const t = cell.getAttribute("t") || "";
    if (t === "inlineStr") {
      const is = findChildByLocalName(cell, "is");
      if (!is) return "";
      const textNodes = Array.from(is.getElementsByTagNameNS("*", "t"));
      return textNodes.map((n) => n.textContent || "").join("");
    }

    const v = findChildByLocalName(cell, "v")?.textContent || "";
    if (t === "s") {
      const idx = Number(v);
      return Number.isFinite(idx) ? sharedStrings[idx] || "" : "";
    }
    return v;
  };

  const createNsiCell = (
    doc: XMLDocument,
    ref: string,
    value: string,
    styleIndex?: string | null,
  ): Element => {
    const cell = doc.createElementNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "c");
    cell.setAttribute("r", ref);
    cell.setAttribute("t", "inlineStr");
    if (styleIndex) cell.setAttribute("s", styleIndex);

    const is = doc.createElementNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "is");
    const t = doc.createElementNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "t");
    const safeValue = sanitizeForExcelXml(value);
    if (/^\s|\s$/.test(safeValue)) {
      t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    }
    t.textContent = safeValue;
    is.appendChild(t);
    cell.appendChild(is);
    return cell;
  };

  const createNsiFile = async (data: OutputRow[]): Promise<Blob> => {
    const rawTemplateName = "Заявка на изменение позиции.xlsx";
    const templateUrlRaw = `${import.meta.env.BASE_URL}template/${rawTemplateName}`;
    const templateUrlEncoded = `${import.meta.env.BASE_URL}template/${encodeURIComponent(rawTemplateName)}`;

    const responseRaw = await fetch(templateUrlRaw);
    const response = responseRaw.ok ? responseRaw : await fetch(templateUrlEncoded);
    if (!response.ok) throw new Error("Не удалось загрузить шаблон НСИ");

    const templateBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(templateBuffer);

    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
    if (!workbookXml || !relsXml) {
      throw new Error("Структура шаблона повреждена: workbook.xml не найден");
    }

    const parser = new DOMParser();
    const workbookDoc = parser.parseFromString(workbookXml, "application/xml");
    const relsDoc = parser.parseFromString(relsXml, "application/xml");

    const sheetEl = Array.from(workbookDoc.getElementsByTagNameNS("*", "sheet")).find((s) =>
      normalizeColumnName(s.getAttribute("name") || "") === "данные о поставках",
    );
    if (!sheetEl) throw new Error('Лист "Данные о поставках" не найден в шаблоне');

    const relId =
      sheetEl.getAttribute("r:id") ||
      sheetEl.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    if (!relId) throw new Error("Не найдена связь r:id для листа");

    const relEl = Array.from(relsDoc.getElementsByTagNameNS("*", "Relationship")).find(
      (r) => r.getAttribute("Id") === relId,
    );
    const target = relEl?.getAttribute("Target");
    if (!target) throw new Error("Не найден Target листа в workbook rels");

    const sheetPath = `xl/${target.replace(/^\/+/, "").replace(/^xl\//, "").replace(/^..\//, "")}`;
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) throw new Error(`Не найден XML листа: ${sheetPath}`);

    const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
    const sharedStrings: string[] = [];
    if (sharedStringsXml) {
      const sstDoc = parser.parseFromString(sharedStringsXml, "application/xml");
      const siNodes = Array.from(sstDoc.getElementsByTagNameNS("*", "si"));
      for (const si of siNodes) {
        const ts = Array.from(si.getElementsByTagNameNS("*", "t"));
        sharedStrings.push(ts.map((t) => t.textContent || "").join(""));
      }
    }

    const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
    const worksheetEl = sheetDoc.getElementsByTagNameNS("*", "worksheet")[0];
    const sheetDataEl = sheetDoc.getElementsByTagNameNS("*", "sheetData")[0];
    if (!worksheetEl || !sheetDataEl) {
      throw new Error("Неверная структура worksheet XML");
    }

    const rows = Array.from(sheetDataEl.getElementsByTagNameNS("*", "row"));
    const rowByNumber = new Map<number, Element>();
    for (const rowEl of rows) {
      const rowNum = Number(rowEl.getAttribute("r") || "0");
      if (rowNum > 0) rowByNumber.set(rowNum, rowEl);
    }
    let headerRowNumber = -1;
    let warehouseColumn = -1;
    let codeColumn = -1;
    let shippingReadyColumn = -1;

    for (const rowEl of rows) {
      const rowNum = Number(rowEl.getAttribute("r") || "0");
      if (!rowNum || rowNum > 100) continue;

      let w = -1;
      let c = -1;
      let s = -1;
      const cells = Array.from(rowEl.getElementsByTagNameNS("*", "c"));
      for (const cellEl of cells) {
        const ref = cellEl.getAttribute("r") || "";
        const col = parseCellRef(ref).col;
        if (!col || col > HEADER_SCAN_COLUMNS_LIMIT) continue;
        const value = normalizeColumnName(getCellText(cellEl, sharedStrings).replace(/\s+/g, " ").trim());
        if (value === "код склада") w = col;
        if (value === "код") c = col;
        if (value === "срок готовности к отгрузке") s = col;
      }

      if (w > 0 && c > 0 && s > 0) {
        headerRowNumber = rowNum;
        warehouseColumn = w;
        codeColumn = c;
        shippingReadyColumn = s;
        break;
      }
    }

    if (headerRowNumber < 0) {
      throw new Error('В шаблоне не найдены столбцы "Код склада", "Код" и "Срок готовности к отгрузке"');
    }

    const startRow = headerRowNumber + 1;
    const templateRowEl = rows.find((r) => Number(r.getAttribute("r") || "0") === startRow);

    const templateStyles = new Map<number, string>();
    if (templateRowEl) {
      const templateCells = Array.from(templateRowEl.getElementsByTagNameNS("*", "c"));
      for (const cEl of templateCells) {
        const ref = cEl.getAttribute("r") || "";
        const col = parseCellRef(ref).col;
        const style = cEl.getAttribute("s");
        if (col > 0 && style !== null) {
          templateStyles.set(col, style);
        }
      }
    }

    const getOrCreateRow = (rowNum: number): Element => {
      const existing = rowByNumber.get(rowNum);
      if (existing) return existing;

      const rowEl = sheetDoc.createElementNS(
        "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "row",
      );
      rowEl.setAttribute("r", String(rowNum));
      // Мы добавляем строки последовательно (startRow, startRow+1, ...),
      // поэтому можно безопасно append без дорогого поиска позиции.
      sheetDataEl.appendChild(rowEl);
      rowByNumber.set(rowNum, rowEl);
      return rowEl;
    };

    const setCell = (rowEl: Element, rowNum: number, colNum: number, value: string) => {
      const ref = `${colToLetters(colNum)}${rowNum}`;
      const currentCells = Array.from(rowEl.getElementsByTagNameNS("*", "c"));
      let cellEl = currentCells.find((c) => (c.getAttribute("r") || "") === ref);

      const styleIdx = templateStyles.get(colNum) ?? null;
      if (!cellEl) {
        cellEl = createNsiCell(sheetDoc, ref, value, styleIdx);
        let inserted = false;
        for (const c of currentCells) {
          const cRef = c.getAttribute("r") || "";
          const cCol = parseCellRef(cRef).col;
          if (cCol > colNum) {
            rowEl.insertBefore(cellEl, c);
            inserted = true;
            break;
          }
        }
        if (!inserted) rowEl.appendChild(cellEl);
      } else {
        while (cellEl.firstChild) cellEl.removeChild(cellEl.firstChild);
        cellEl.setAttribute("t", "inlineStr");
        if (styleIdx) cellEl.setAttribute("s", styleIdx);
        const replacement = createNsiCell(sheetDoc, ref, value, styleIdx);
        Array.from(replacement.childNodes).forEach((n) => cellEl!.appendChild(n.cloneNode(true)));
      }
    };

    for (let i = 0; i < data.length; i++) {
      const rowNum = startRow + i;
      const rowEl = getOrCreateRow(rowNum);
      setCell(rowEl, rowNum, warehouseColumn, data[i].ЦС);
      setCell(rowEl, rowNum, codeColumn, data[i].Код);
      setCell(rowEl, rowNum, shippingReadyColumn, data[i].Обработка);
    }

    const dimensionEl =
      sheetDoc.getElementsByTagNameNS("*", "dimension")[0] ||
      (() => {
        const d = sheetDoc.createElementNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "dimension");
        const firstChild = worksheetEl.firstChild;
        if (firstChild) worksheetEl.insertBefore(d, firstChild);
        else worksheetEl.appendChild(d);
        return d;
      })();

    const dimRef = dimensionEl.getAttribute("ref") || "A1";
    const [startRef, endRefRaw] = dimRef.includes(":") ? dimRef.split(":") : [dimRef, dimRef];
    const endRef = endRefRaw || startRef;
    const endParsed = parseCellRef(endRef.toUpperCase());
    const maxRow = Math.max(endParsed.row, startRow + data.length - 1);
    const endColLetters = colToLetters(Math.max(endParsed.col, shippingReadyColumn));
    dimensionEl.setAttribute("ref", `${startRef}:${endColLetters}${maxRow}`);

    const serializer = new XMLSerializer();
    zip.file(sheetPath, serializer.serializeToString(sheetDoc));
    const buffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  };

  const handleDownload = async () => {
    try {
      const allData = buildOutputData();
      if (!allData || allData.length === 0) {
        const meta = (allData as any).__meta as { excludedAll?: boolean } | undefined;

        if (meta?.excludedAll) {
          window.dispatchEvent(
            new CustomEvent("fileFormationInfo", {
              detail: {
                message:
                  "Изменений нет: сроки из файла «Данные о поставках» уже совпадают со сроками поставщика. Файл НСИ сформирован не будет.",
              },
            }),
          );
          if (onProcessingComplete) onProcessingComplete(true);
          return;
        }

        if (onProcessingComplete) onProcessingComplete(false);
        return;
      }

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error("Превышено время формирования файла НСИ"));
          }, ms);
          promise
            .then((result) => {
              clearTimeout(timer);
              resolve(result);
            })
            .catch((error) => {
              clearTimeout(timer);
              reject(error);
            });
        });

      const blob = await withTimeout(createNsiFile(allData), 120000);
      const success = await downloadBlob(blob, getNsiFileName());
      if (onProcessingComplete) onProcessingComplete(success);
    } catch (error) {
      console.error("Ошибка при формировании файла НСИ:", error);
      if (onProcessingComplete) onProcessingComplete(false);
    }
  };

  return null;
};

export default FileFormationNSI;
