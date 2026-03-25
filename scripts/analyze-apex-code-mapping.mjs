import ExcelJS from "exceljs";
import XLSX from "xlsx";

const apexPath = process.argv[2];
const deliveryDataPath = process.argv[3];

if (!apexPath || !deliveryDataPath) {
  console.error(
    "Usage: node scripts/analyze-apex-code-mapping.mjs <apex.xlsx> <deliveryData.xlsx>"
  );
  process.exit(1);
}

function norm(v) {
  return (v ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function pickColumn(keys, exactList, includesList) {
  const nk = keys.map((k) => ({
    k,
    n: k.toString().trim().replace(/\s+/g, " ").toLowerCase(),
  }));
  for (const e of exactList) {
    const ne = e.toLowerCase();
    const f = nk.find((x) => x.n === ne);
    if (f) return f.k;
  }
  for (const k of nk) {
    for (const inc of includesList) {
      if (k.n.includes(inc)) return k.k;
    }
  }
  return null;
}

// --- DeliveryData: build article -> code map ---
// В DeliveryData заголовки могут быть не в первой строке, поэтому:
// 1) читаем лист как матрицу (header: 1)
// 2) ищем строку заголовков по "Код/Артикул"
// 3) строим индекс столбцов и собираем маппинг
const ddWb = XLSX.readFile(deliveryDataPath, { cellDates: true });
const ddWs = ddWb.Sheets[ddWb.SheetNames[0]];
const ddMatrix = XLSX.utils.sheet_to_json(ddWs, { header: 1, defval: "" });
if (!ddMatrix.length) {
  console.error("DeliveryData sheet is empty");
  process.exit(1);
}

function detectHeaderRow(matrix) {
  const candidates = ["код", "артикул"];
  let best = { rowIndex: null, score: -1, header: null };
  const maxScan = Math.min(80, matrix.length);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    const normalized = row.map((v) =>
      v ? v.toString().trim().replace(/\s+/g, " ").toLowerCase() : ""
    );
    let score = 0;
    for (const c of candidates) {
      if (normalized.some((x) => x === c || x.includes(c))) score++;
    }
    if (score > best.score) best = { rowIndex: r, score, header: row };
  }
  return best.score > 0 ? best : null;
}

const headerDetect = detectHeaderRow(ddMatrix);
if (!headerDetect) {
  console.error("Could not detect header row in DeliveryData");
  process.exit(1);
}

const ddHeaderRowIndex = headerDetect.rowIndex;
const ddHeader = ddMatrix[ddHeaderRowIndex].map((v) =>
  v ? v.toString().trim().replace(/\s+/g, " ") : ""
);

const ddCodeColIndex = ddHeader.findIndex((h) => h && h.toLowerCase() === "код");
const ddArticleColIndex = ddHeader.findIndex((h) => h && h.toLowerCase() === "артикул");

console.log("DeliveryData detected header row:", ddHeaderRowIndex + 1);
console.log("DeliveryData detected columns:", {
  ddCodeColIndex: ddCodeColIndex >= 0 ? ddCodeColIndex + 1 : null,
  ddArticleColIndex: ddArticleColIndex >= 0 ? ddArticleColIndex + 1 : null,
});

const articleToCode = new Map();
for (let r = ddHeaderRowIndex + 1; r < ddMatrix.length; r++) {
  const row = ddMatrix[r];
  if (!Array.isArray(row)) continue;
  const a = ddArticleColIndex >= 0 ? norm(row[ddArticleColIndex]) : "";
  const c = ddCodeColIndex >= 0 ? norm(row[ddCodeColIndex]) : "";
  if (a && c && !articleToCode.has(a)) articleToCode.set(a, c);
}
console.log("DeliveryData articleToCode size:", articleToCode.size);

// --- APEX output: locate header row and 'Код' column ---
const apexWb = new ExcelJS.Workbook();
await apexWb.xlsx.readFile(apexPath);
const apexWs = apexWb.worksheets[0];

let headerRowNumber = null;
let codeColNumber = null;

for (let r = 1; r <= Math.min(80, apexWs.rowCount); r++) {
  const row = apexWs.getRow(r);
  for (let c = 1; c <= row.cellCount; c++) {
    const v = row.getCell(c).value;
    const s = (typeof v === "string" ? v : String(v ?? "")).trim();
    if (s === "Код") {
      headerRowNumber = r;
      codeColNumber = c;
      break;
    }
  }
  if (headerRowNumber) break;
}

console.log("APEX detected header:", {
  headerRowNumber,
  codeColNumber,
  rowCount: apexWs.rowCount,
});

if (!headerRowNumber || !codeColNumber) {
  console.error("Could not find 'Код' header in APEX file");
  process.exit(1);
}

let totalNonEmpty = 0;
let apexCodeMatchesAnyArticle = 0;
let apexCodeLooksLikeArticleAndNotMapped = 0;

const samples = [];

for (let r = headerRowNumber + 1; r <= apexWs.rowCount; r++) {
  const cell = apexWs.getRow(r).getCell(codeColNumber);
  const raw = cell.value;
  const code = norm(typeof raw === "object" && raw && "text" in raw ? raw.text : raw);
  if (!code) continue;
  totalNonEmpty++;

  if (articleToCode.has(code)) {
    apexCodeMatchesAnyArticle++;
    const expected = articleToCode.get(code);
    if (expected !== code) {
      apexCodeLooksLikeArticleAndNotMapped++;
      if (samples.length < 30) {
        samples.push({ row: r, valueInApex: code, expectedCode: expected });
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      totalNonEmpty,
      apexCodeMatchesAnyArticle,
      apexCodeLooksLikeArticleAndNotMapped,
    },
    null,
    2
  )
);

console.log("Samples (row, apex code, expected code):");
for (const s of samples) console.log(s);

