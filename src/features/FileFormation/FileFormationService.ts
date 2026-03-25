import { processProcessingValue } from "../../utils/ExcelUtils";

// Нормализация названий и значений
const normalizeColumnName = (name: string): string => {
  if (!name) return "";
  // Нормализуем пробелы, чтобы заголовки совпадали даже при лишних/разных пробелах
  return name.toString().trim().replace(/\s+/g, " ").toLowerCase();
};

const normalizeValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  return value.toString().trim();
};

// Нормализация "срока/обработки" для сравнения:
// - если значение похоже на число (в т.ч. с запятой), приводим к числу и обратно к строке
// - если не число — сравниваем как есть (после processProcessingValue)
const canonicalProcessingValue = (value: any): string => {
  const processed = processProcessingValue(value);
  if (processed === "!!!") return "!!!";
  const num = parseFloat(processed.replace(",", "."));
  if (!isNaN(num)) return String(num);
  return processed;
};

// ===== ЛОГИКА ДЛЯ FileFormationTwo (стандартный сценарий) =====

// Поиск столбца со сроками в deliveryTime
const findProcessingColumnInDeliveryTime = (row: any): string | null => {
  const exactColumnNames = [
    // ваш кейс
    "Срок Готовн Отгр (Обработка)",
    "Срок готовн отгр (обработка)",

    // fallback точные совпадения
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
    "Время поставки",
  ];

  const rowKeys = Object.keys(row);

  // 1) Сначала ищем точное совпадение из списка точных совпадений
  for (const columnName of exactColumnNames) {
    const normalizedColumnName = normalizeColumnName(columnName);
    const found = rowKeys.find((rowKey) => normalizeColumnName(rowKey) === normalizedColumnName);
    if (found) return found;
  }

  // 2) Если точных совпадений не нашли — ищем частично, но с приоритетом
  // и исключаем "предварительная обработка", чтобы не брать не тот столбец.
  let bestKey: string | null = null;
  let bestScore = -Infinity;

  for (const rowKey of rowKeys) {
    const k = normalizeColumnName(rowKey);
    if (!k) continue;
    if (k.includes("предвар")) continue; // важный фильтр от неверного столбца

    const hasDeadlineWords =
      k.includes("срок") ||
      k.includes("производство") ||
      k.includes("изготовление") ||
      k.includes("поставки") ||
      k.includes("выполнения") ||
      k.includes("время") ||
      k.includes("term") ||
      k.includes("lead") ||
      k.includes("delivery") ||
      k.includes("production") ||
      k.includes("manufacturing");
    if (!hasDeadlineWords) continue;

    let score = 0;
    if (k.includes("готовн")) score += 70;
    if (k.includes("отгр")) score += 70;
    if (k.includes("обработк")) score += 40;
    if (k.includes("срок")) score += 20;

    // Чуть снижаем score за слишком длинные "шумные" названия
    score -= Math.max(0, k.length - 45) * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestKey = rowKey;
    }
  }

  return bestKey;
};

// Поиск столбца с артикулом
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
    "Референс",
    "SKU",
    "Код товара",
    "Код продукции",
    "Код изделия",
    "Код позиции",
  ];

  const rowKeys = Object.keys(row);

  for (const columnName of possibleColumnNames) {
    const normalizedColumnName = normalizeColumnName(columnName);
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey === normalizedColumnName) {
        return rowKey;
      }
    }
  }

  for (const rowKey of rowKeys) {
    const normalizedRowKey = normalizeColumnName(rowKey);
    if (
      normalizedRowKey.includes("артикул") ||
      normalizedRowKey.includes("article") ||
      normalizedRowKey.includes("референс") ||
      normalizedRowKey.includes("кодтовара") ||
      normalizedRowKey.includes("кодпродукции") ||
      normalizedRowKey.includes("кодизделия") ||
      normalizedRowKey.includes("кодпозиции")
    ) {
      return rowKey;
    }
  }

  return null;
};

// Поиск столбца "Код" в deliveryData
const findCodeColumnInDeliveryData = (row: any): string | null => {
  const possibleCodeColumnNames = [
    "Код",
    "Артикул",
    "Артикул поставщика",
    "Код позиции",
    "Код товара",
    "Артикул товара",
    "Код продукции",
    "Артикул продукции",
    "Код изделия",
    "Артикул изделия",
    "Article",
    "Article number",
    "Product code",
    "Референс",
    "SKU",
  ];

  const rowKeys = Object.keys(row);

  for (const columnName of possibleCodeColumnNames) {
    const normalizedColumnName = normalizeColumnName(columnName);
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey === normalizedColumnName) {
        return rowKey;
      }
    }
  }

  for (const rowKey of rowKeys) {
    const normalizedRowKey = normalizeColumnName(rowKey);
    if (
      normalizedRowKey.includes("код") ||
      normalizedRowKey.includes("артикул") ||
      normalizedRowKey.includes("article") ||
      normalizedRowKey.includes("референс") ||
      normalizedRowKey.includes("product") ||
      normalizedRowKey.includes("item")
    ) {
      return rowKey;
    }
  }

  return null;
};

// Поиск столбца с текущим сроком/обработкой в deliveryData
const findExistingProcessingColumnInDeliveryData = (row: any): string | null => {
  const possibleNames = [
    "Обработка",
    "Срок Готовн Отгр (Обработка)",
    "Срок готовн отгр (обработка)",
    "Срок",
    "Сроки",
    "Срок поставки",
    "Срок производства",
  ];

  const rowKeys = Object.keys(row || {});

  for (const columnName of possibleNames) {
    const normalizedColumnName = normalizeColumnName(columnName);
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey === normalizedColumnName) {
        return rowKey;
      }
    }
  }

  // Частичный поиск с приоритетом "готовн/отгр" и исключением "предварительная обработка"
  let bestKey: string | null = null;
  let bestScore = -Infinity;

  for (const rowKey of rowKeys) {
    const k = normalizeColumnName(rowKey);
    if (k.includes("предвар")) continue;

    const hasDeadlineWords =
      k.includes("срок") ||
      k.includes("готовн") ||
      k.includes("отгр") ||
      k.includes("обработк");

    if (!hasDeadlineWords) continue;

    let score = 0;
    if (k.includes("готовн")) score += 70;
    if (k.includes("отгр")) score += 70;
    if (k.includes("обработк")) score += 40;
    if (k.includes("срок")) score += 20;
    score -= Math.max(0, k.length - 45) * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestKey = rowKey;
    }
  }

  return bestKey;

};

// Создание хэш-таблицы артикул -> код
const createArticleToCodeMap = (
  deliveryData: any[]
): {
  map: Map<string, string>;
  processingMap: Map<string, string>;
  articleColumn: string | null;
  codeColumn: string | null;
} => {
  if (!deliveryData || deliveryData.length === 0) {
    return {
      map: new Map(),
      processingMap: new Map(),
      articleColumn: null,
      codeColumn: null,
    };
  }

  const firstRow = deliveryData[0];
  const articleColumn = findArticleColumn(firstRow);
  const codeColumn = findCodeColumnInDeliveryData(firstRow);
  const processingColumn = findExistingProcessingColumnInDeliveryData(firstRow);

  if (!articleColumn || !codeColumn) {
    return {
      map: new Map(),
      processingMap: new Map(),
      articleColumn,
      codeColumn,
    };
  }

  const map = new Map<string, string>();
  const processingMap = new Map<string, string>();

  for (let i = 0; i < deliveryData.length; i++) {
    const row = deliveryData[i];
    const article = normalizeValue(row[articleColumn]);
    const code = normalizeValue(row[codeColumn]);

    if (article && code) {
      map.set(article, code);
      if (processingColumn) {
        const existingProcessing = canonicalProcessingValue(row[processingColumn]);
        processingMap.set(article, existingProcessing);
      }
    }
  }

  return { map, processingMap, articleColumn, codeColumn };
};

// Публичная функция: построение allData для FileFormationTwo
export const buildStandardAllData = (
  deliveryTimeData: any[],
  deliveryData: any[]
): any[] => {
  // Стандартная логика формирования нового APEX (когда загружены оба файла):
  // - DeliveryData: всегда "Артикул" и всегда "Код"
  // - DeliveryTime: колонка с артикулом может называться иначе (артикул/код/артикул поставщика/артикул товара/референс)
  // - Если артикулы совпали, то в APEX в колонку "Код" нужно вставить DeliveryData."Код"
  // - Строку исключаем только когда по этому же артикулу срок/обработка совпали
  if (!deliveryTimeData || deliveryTimeData.length === 0) return [];
  if (!deliveryData || deliveryData.length === 0) return [];

  const csValues = ["R01", "R31", "R77", "R04", "R02", "R29", "R19", "V30"];
  const copyCount = csValues.length;

  const firstTimeRow = deliveryTimeData[0];
  const firstDeliveryRow = deliveryData[0];

  // 1) DeliveryData: строго по "Артикул" и "Код" (с нормализацией пробелов/регистра)
  const deliveryKeys = Object.keys(firstDeliveryRow || {});
  const deliveryArticleColumn =
    deliveryKeys.find((k) => normalizeColumnName(k) === normalizeColumnName("Артикул")) || null;
  const deliveryCodeColumn =
    deliveryKeys.find((k) => normalizeColumnName(k) === normalizeColumnName("Код")) || null;

  const existingProcessingColumn = findExistingProcessingColumnInDeliveryData(firstDeliveryRow);
  if (!deliveryArticleColumn || !deliveryCodeColumn || !existingProcessingColumn) {
    console.log("Нет обязательных столбцов в DeliveryData (Артикул/Код/Срок/Обработка)");
    return [];
  }

  // 2) DeliveryTime: ищем колонку с артикулом (точно -> частично)
  const findTimeArticleColumn = (row: any): string | null => {
    const rowKeys = Object.keys(row || {});

    const exactCandidates = [
      "Артикул",
      "Код",
      "Артикул поставщика",
      "Артикул товара",
      "Референс",
    ];
    for (const cand of exactCandidates) {
      const normalizedCand = normalizeColumnName(cand);
      const found = rowKeys.find((k) => normalizeColumnName(k) === normalizedCand);
      if (found) return found;
    }

    // Если точных нет — выбираем лучшую по смыслу колонку:
    // "артикул" / "референс" / "код" (как артикул), но не столбец сроков/обработки.
    let bestKey: string | null = null;
    let bestScore = -Infinity;
    for (const k of rowKeys) {
      const nk = normalizeColumnName(k);
      if (!nk) continue;

      if (nk.includes("срок") || nk.includes("обработ") || nk.includes("отгр")) continue;

      let score = 0;
      if (nk.includes("артикул")) score += 70;
      if (nk.includes("референс")) score += 60;
      if (nk.includes("поставщика")) score += 25;
      if (nk.includes("товара")) score += 25;
      if (nk === "код") score += 50;
      if (nk.includes("код")) score += 10;

      if (score > bestScore) {
        bestScore = score;
        bestKey = k;
      }
    }
    return bestKey;
  };

  const timeArticleColumn = findTimeArticleColumn(firstTimeRow);
  const timeProcessingColumn = findProcessingColumnInDeliveryTime(firstTimeRow);
  if (!timeArticleColumn || !timeProcessingColumn) {
    console.log("Нет ключевых столбцов в DeliveryTime (Артикул/Срок/Обработка)");
    return [];
  }

  // 3) DeliveryData: Артикул -> Код, Артикул -> существующий срок/обработка (канонический)
  const articleToCode = new Map<string, string>();
  const articleToExistingCanonicalProcessing = new Map<string, string>();

  // Единый ключ для сопоставления артикулов:
  // - тримим пробелы
  // - схлопываем подряд идущие пробелы (бывают двойные/неразрывные)
  // - приводим к верхнему регистру
  const toArticleKey = (v: any): string => {
    const s = normalizeValue(v).replace(/\u00A0/g, " "); // NBSP -> обычный пробел
    return s.replace(/\s+/g, " ").toUpperCase();
  };

  for (let i = 0; i < deliveryData.length; i++) {
    const row = deliveryData[i];
    const article = normalizeValue(row[deliveryArticleColumn]);
    if (!article) continue;
    const articleKey = toArticleKey(article);

    const code = normalizeValue(row[deliveryCodeColumn]);
    if (code && !articleToCode.has(articleKey)) {
      articleToCode.set(articleKey, code);
    }

    const existingCanonical = canonicalProcessingValue(row[existingProcessingColumn]);
    if (!articleToExistingCanonicalProcessing.has(articleKey)) {
      articleToExistingCanonicalProcessing.set(articleKey, existingCanonical);
    }
  }

  console.time("Filter and process data (standard)");

  const allData: any[] = [];
  const filteredTimeRows: Array<{ code: string; processingValue: string }> = [];
  let matchedCount = 0;
  let excludedCount = 0;

  for (let i = 0; i < deliveryTimeData.length; i++) {
    const timeRow = deliveryTimeData[i];
    const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
    if (!timeArticle) continue;
    const timeArticleKey = toArticleKey(timeArticle);

    const processingValue = processProcessingValue(timeRow[timeProcessingColumn]);
    const newCanonical = canonicalProcessingValue(processingValue);

    const existingCanonical = articleToExistingCanonicalProcessing.get(timeArticleKey);

    // Если артикул есть в DeliveryData — сравниваем сроки.
    if (existingCanonical !== undefined) {
      matchedCount++;
      if (existingCanonical === newCanonical) {
        excludedCount++;
        continue; // срок совпал -> строку исключаем
      }
    }

    // Артикул может совпасть даже без срока (или вообще не совпасть) — но код кладем ТОЛЬКО по DeliveryData.
    const outputCode = articleToCode.get(timeArticleKey) || "";
    // Если код не удалось замаппить, лучше пропустить строку,
    // чем получить пустую "Код" при заполненной "Обработка".
    if (!outputCode) continue;

    filteredTimeRows.push({ code: outputCode, processingValue });
  }

  for (let copyIndex = 0; copyIndex < copyCount; copyIndex++) {
    const csValue = csValues[copyIndex];
    for (let i = 0; i < filteredTimeRows.length; i++) {
      const item = filteredTimeRows[i];
      allData.push({
        ЦС: csValue,
        Код: item.code,
        Тип: "",
        Организация: "",
        "Предварительная обработка": "",
        Обработка: item.processingValue || "!!!",
        "Заключительная обработка": "",
        Статус: "",
        Сообщение: "",
      });
    }
  }

  console.timeEnd("Filter and process data (standard)");

  (allData as any).__meta = {
    matchedCount,
    excludedCount,
    excludedAll: matchedCount > 0 && excludedCount === matchedCount,
  };

  return allData;
};

// ===== ЛОГИКА ДЛЯ ExclusionFileSE (особые правила) =====

const findMoscowColumn = (row: any): string | null => {
  const possibleNames = [
    "Срок готовности к отгрузке со склада Москва",
    "Срок готовности Москва",
    "Москва срок",
    "Срок Москва",
    "Срок отгрузки Москва",
    "Москва отгрузка",
  ];

  const rowKeys = Object.keys(row);

  for (const columnName of possibleNames) {
    const normalizedColumnName = normalizeColumnName(columnName);
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey === normalizedColumnName) {
        return rowKey;
      }
    }
  }

  for (const rowKey of rowKeys) {
    const normalizedRowKey = normalizeColumnName(rowKey);
    if (
      normalizedRowKey.includes("москва") &&
      (normalizedRowKey.includes("срок") ||
        normalizedRowKey.includes("отгрузк"))
    ) {
      return rowKey;
    }
  }

  return null;
};

const findEkaterinburgColumn = (row: any): string | null => {
  const possibleNames = [
    "Срок готовности к отгрузке со склада Екатеринбург",
    "Срок готовности Екатеринбург",
    "Екатеринбург срок",
    "Срок Екатеринбург",
    "Срок отгрузки Екатеринбург",
    "Екатеринбург отгрузка",
  ];

  const rowKeys = Object.keys(row);

  for (const columnName of possibleNames) {
    const normalizedColumnName = normalizeColumnName(columnName);
    for (const rowKey of rowKeys) {
      const normalizedRowKey = normalizeColumnName(rowKey);
      if (normalizedRowKey === normalizedColumnName) {
        return rowKey;
      }
    }
  }

  for (const rowKey of rowKeys) {
    const normalizedRowKey = normalizeColumnName(rowKey);
    if (
      (normalizedRowKey.includes("екатеринбург") ||
        normalizedRowKey.includes("екб")) &&
      (normalizedRowKey.includes("срок") ||
        normalizedRowKey.includes("отгрузк"))
    ) {
      return rowKey;
    }
  }

  return null;
};

export const buildExclusionAllData = (
  deliveryTimeData: any[],
  deliveryData: any[]
): any[] => {
  // SE-сценарий:
  // - используем отдельные сроки для Москвы и Екатеринбурга,
  // - применяем разные наборы ЦС для каждого склада,
  // - формируем итоговые строки только по пересечению с DeliveryData.
  console.time("Create hash map");
  const {
    map: articleToCodeMap,
    articleColumn,
    codeColumn,
  } = createArticleToCodeMap(deliveryData);
  console.timeEnd("Create hash map");

  if (!articleColumn || !codeColumn || articleToCodeMap.size === 0) {
    console.log("Нет данных для формирования файла");
    return [];
  }

  console.log(`Создана хэш-таблица с ${articleToCodeMap.size} записями`);

  const firstTimeRow = deliveryTimeData[0];
  const timeArticleColumn = findCodeColumnInDeliveryData(firstTimeRow);

  const moscowColumn = findMoscowColumn(firstTimeRow);
  const ekaterinburgColumn = findEkaterinburgColumn(firstTimeRow);

  if (!timeArticleColumn || (!moscowColumn && !ekaterinburgColumn)) {
    console.log("Не найдены необходимые столбцы в файле поставщика");
    return [];
  }

  console.log(`Найден столбец Москвы: ${moscowColumn}`);
  console.log(`Найден столбец Екатеринбурга: ${ekaterinburgColumn}`);

  console.time("Filter and process data");

  const moscowCS = ["R01", "R02", "R04", "R31", "R77", "V30"];
  const ekaterinburgCS = ["R90", "R19"];

  const allData: any[] = [];
  const filteredTimeData: any[] = [];

  for (let i = 0; i < deliveryTimeData.length; i++) {
    const timeRow = deliveryTimeData[i];
    const timeArticle = normalizeValue(timeRow[timeArticleColumn]);

    if (timeArticle && articleToCodeMap.has(timeArticle)) {
      filteredTimeData.push(timeRow);
    }
  }

  console.log(
    `Найдено ${filteredTimeData.length} совпадений из ${deliveryTimeData.length} строк`
  );

  // Москва
  for (let i = 0; i < moscowCS.length; i++) {
    const csValue = moscowCS[i];

    for (let j = 0; j < filteredTimeData.length; j++) {
      const timeRow = filteredTimeData[j];
      const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
      const code = articleToCodeMap.get(timeArticle);

      let processingValue = "!!!";
      if (moscowColumn) {
        processingValue = processProcessingValue(timeRow[moscowColumn]);
      }

      allData.push({
        ЦС: csValue,
        Код: code || "",
        Тип: "",
        Организация: "",
        "Предварительная обработка": "",
        Обработка: processingValue,
        "Заключительная обработка": "",
        Статус: "",
        Сообщение: "",
      });
    }
  }

  // Екатеринбург
  for (let i = 0; i < ekaterinburgCS.length; i++) {
    const csValue = ekaterinburgCS[i];

    for (let j = 0; j < filteredTimeData.length; j++) {
      const timeRow = filteredTimeData[j];
      const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
      const code = articleToCodeMap.get(timeArticle);

      let processingValue = "!!!";
      if (ekaterinburgColumn) {
        processingValue = processProcessingValue(timeRow[ekaterinburgColumn]);
      }

      allData.push({
        ЦС: csValue,
        Код: code || "",
        Тип: "",
        Организация: "",
        "Предварительная обработка": "",
        Обработка: processingValue,
        "Заключительная обработка": "",
        Статус: "",
        Сообщение: "",
      });
    }
  }

  console.timeEnd("Filter and process data");

  if (allData.length === 0) {
    console.log("Нет данных для формирования файла");
  } else {
    console.log(`Сформировано ${allData.length} строк данных`);
  }

  return allData;
};

// ===== ЛОГИКА ДЛЯ ExclusionFileDKC (особые правила DKC) =====

// Поиск столбца "Отделение" в DeliveryData
const findDepartmentColumn = (row: any): string | null => {
  const rowKeys = Object.keys(row);
  for (const key of rowKeys) {
    const normalizedKey = normalizeColumnName(key);
    if (normalizedKey === "отделение" || normalizedKey.includes("отделение")) {
      return key;
    }
  }
  return null;
};

const findExactColumn = (row: any, exactHeader: string): string | null => {
  const target = normalizeColumnName(exactHeader);
  const keys = Object.keys(row);
  for (const key of keys) {
    if (normalizeColumnName(key) === target) return key;
  }
  return null;
};

const findCsColumn = (row: any): string | null => findExactColumn(row, "ЦС");

// Для DeliveryTime DKC 1200 нужен точный столбец срока
const findDkc1200ProcessingColumn = (row: any): string | null => {
  // Ищем строго "Средний срок поставки, дни", но оставляем запас на пробелы/регистр
  const exact = findExactColumn(row, "Средний срок поставки, дни");
  if (exact) return exact;

  // Фолбэк: если вдруг в файле чуть по-другому, ищем по ключевым словам
  const keys = Object.keys(row);
  for (const key of keys) {
    const k = normalizeColumnName(key);
    if (k.includes("средн") && k.includes("срок") && k.includes("поставк")) {
      return key;
    }
    if (k.includes("средний срок поставки") && (k.includes("дн") || k.includes("дни"))) {
      return key;
    }
  }
  return null;
};

// Публичная функция для DKC: фильтрация по "АО ДКС Сибирь" и построение allData
export const buildDkcAllData = (
  deliveryTimeData: any[],
  deliveryData: any[],
  allowedCs: string[]
): any[] => {
  // Базовый DKC-сценарий:
  // - ограничиваем DeliveryData нужным отделением,
  // - находим совпадения по артикулу,
  // - разворачиваем результат по разрешенному списку ЦС.
  console.time("Create hash map (DKC)");

  if (!deliveryData || deliveryData.length === 0) {
    console.log("DeliveryData пуст для DKC");
    return [];
  }

  // Находим столбец "Отделение" и фильтруем только "АО ДКС Сибирь"
  const firstDeliveryRow = deliveryData[0];
  const departmentColumn = findDepartmentColumn(firstDeliveryRow);

  if (!departmentColumn) {
    console.log('Столбец "Отделение" не найден в DeliveryData для DKC');
    return [];
  }

  const filteredDeliveryData = deliveryData.filter((row) => {
    const depValue = normalizeValue(row[departmentColumn]);
    return depValue.toLowerCase() === "ао дкс сибирь".toLowerCase();
  });

  if (filteredDeliveryData.length === 0) {
    console.log('В DeliveryData нет строк с "АО ДКС Сибирь"');
    return [];
  }

  // Строим карту артикул -> код только по отфильтрованным данным
  const {
    map: articleToCodeMap,
    articleColumn,
    codeColumn,
  } = createArticleToCodeMap(filteredDeliveryData);

  console.timeEnd("Create hash map (DKC)");

  if (!articleColumn || !codeColumn || articleToCodeMap.size === 0) {
    console.log("Нет данных для формирования файла DKC (нет карты артикулов)");
    return [];
  }

  console.log(
    `DKC: создана хэш-таблица с ${articleToCodeMap.size} записями (АО ДКС Сибирь)`
  );

  if (!deliveryTimeData || deliveryTimeData.length === 0) {
    console.log("DeliveryTimeData пуст для DKC");
    return [];
  }

  const firstTimeRow = deliveryTimeData[0];
  const timeArticleColumn = findCodeColumnInDeliveryData(firstTimeRow);
  const timeProcessingColumn = findProcessingColumnInDeliveryTime(firstTimeRow);

  if (!timeArticleColumn) {
    console.log(
      "DKC: не найден столбец с артикулом/кодом в файле поставщика (DeliveryTime)"
    );
    return [];
  }

  console.time("Filter and process data (DKC)");

  const allData: any[] = [];
  const filteredTimeData: any[] = [];

  // Находим строки DeliveryTime, для которых есть код в карте
  for (let i = 0; i < deliveryTimeData.length; i++) {
    const timeRow = deliveryTimeData[i];
    const timeArticle = normalizeValue(timeRow[timeArticleColumn]);

    if (timeArticle && articleToCodeMap.has(timeArticle)) {
      filteredTimeData.push(timeRow);
    }
  }

  console.log(
    `DKC: найдено ${filteredTimeData.length} совпадений из ${deliveryTimeData.length} строк`
  );

  if (filteredTimeData.length === 0) {
    console.log("DKC: нет совпадающих артикулов между DeliveryTime и DeliveryData");
    console.timeEnd("Filter and process data (DKC)");
    return [];
  }

  // Формируем строки для каждого разрешённого ЦС
  for (let i = 0; i < allowedCs.length; i++) {
    const csValue = allowedCs[i];

    for (let j = 0; j < filteredTimeData.length; j++) {
      const timeRow = filteredTimeData[j];
      const timeArticle = normalizeValue(timeRow[timeArticleColumn]);
      const code = articleToCodeMap.get(timeArticle);

      let processingValue = "!!!";
      if (timeProcessingColumn) {
        processingValue = processProcessingValue(timeRow[timeProcessingColumn]);
      }

      allData.push({
        ЦС: csValue,
        Код: code || "",
        Тип: "",
        Организация: "",
        "Предварительная обработка": "",
        Обработка: processingValue,
        "Заключительная обработка": "",
        Статус: "",
        Сообщение: "",
      });
    }
  }

  console.timeEnd("Filter and process data (DKC)");

  if (allData.length === 0) {
    console.log("DKC: нет данных для формирования файла");
  } else {
    console.log(`DKC: сформировано ${allData.length} строк данных`);
  }

  return allData;
};

// DKC 1200: формирование строк только по DeliveryData (ЦС/Код из строки), срок из DeliveryTime
export const buildDkc1200AllData = (
  deliveryTimeData: any[],
  deliveryData: any[],
): any[] => {
  // DKC1200:
  // - срок берем из DeliveryTime по коду/артикулу,
  // - ЦС/Код берем из DeliveryData,
  // - совпадающие текущие сроки исключаем.
  if (!deliveryTimeData || deliveryTimeData.length === 0) {
    console.log("DKC1200: DeliveryTimeData пуст");
    return [];
  }
  if (!deliveryData || deliveryData.length === 0) {
    console.log("DKC1200: DeliveryData пуст");
    return [];
  }

  const firstDeliveryRow = deliveryData[0];
  const deliveryArticleColumn = findExactColumn(firstDeliveryRow, "Артикул");
  const deliveryCodeColumn = findExactColumn(firstDeliveryRow, "Код");
  const deliveryCsColumn = findCsColumn(firstDeliveryRow);
  const deliveryDepartmentColumn = findDepartmentColumn(firstDeliveryRow);
  const deliveryProcessingColumn = findExactColumn(firstDeliveryRow, "Обработка");

  if (!deliveryArticleColumn) {
    console.log('DKC1200: столбец "Артикул" не найден в DeliveryData');
    return [];
  }
  if (!deliveryCodeColumn) {
    console.log('DKC1200: столбец "Код" не найден в DeliveryData');
    return [];
  }
  if (!deliveryCsColumn) {
    console.log('DKC1200: столбец "ЦС" не найден в DeliveryData');
    return [];
  }
  if (!deliveryDepartmentColumn) {
    console.log('DKC1200: столбец "Отделение" не найден в DeliveryData');
    return [];
  }

  const firstTimeRow = deliveryTimeData[0];
  const timeCodeColumn = findExactColumn(firstTimeRow, "Код") ?? findCodeColumnInDeliveryData(firstTimeRow);
  if (!timeCodeColumn) {
    console.log('DKC1200: столбец "Код" не найден в DeliveryTime');
    return [];
  }

  const timeProcessingColumn = findDkc1200ProcessingColumn(firstTimeRow);
  if (!timeProcessingColumn) {
    console.log('DKC1200: столбец "Средний срок поставки, дни" не найден в DeliveryTime');
    return [];
  }

  const normalizeDkcProcessingValue = (value: any): string => {
    const processed = processProcessingValue(value);
    const num = parseFloat(processed.replace(",", "."));
    if (!isNaN(num) && num >= 900 && num <= 999) {
      return "!!!";
    }
    return processed;
  };

  // Строим map: Код(DeliveryTime) -> срок
  const timeCodeToProcessing = new Map<string, string>();
  for (let i = 0; i < deliveryTimeData.length; i++) {
    const row = deliveryTimeData[i];
    const code = normalizeValue(row[timeCodeColumn]);
    if (!code) continue;
    // Если встречаются разделительные строки — просто пропустятся
    const processing = normalizeDkcProcessingValue(row[timeProcessingColumn]);
    timeCodeToProcessing.set(code, processing);
  }

  const allData: any[] = [];
  let matchedCount = 0; // кандидаты, у которых найден срок по коду/артикулу
  let excludedCount = 0; // кандидаты, которые исключили из-за совпадения "Обработка"
  const targetDepartment = "АО ДКС Сибирь".toLowerCase();

  for (let i = 0; i < deliveryData.length; i++) {
    const row = deliveryData[i];
    const article = normalizeValue(row[deliveryArticleColumn]);
    if (!article) continue;

    const department = normalizeValue(row[deliveryDepartmentColumn]).toLowerCase();
    if (department !== targetDepartment) continue;

    const processing = timeCodeToProcessing.get(article);
    if (!processing) continue; // нет совпадения по артикулу/коду
    matchedCount++;

    // Доп. правило: если в DeliveryData уже есть "Обработка" и она совпадает со сроком из DeliveryTime,
    // то строку не добавляем в формируемый файл
    if (deliveryProcessingColumn) {
      const existingProcessing = normalizeDkcProcessingValue(
        row[deliveryProcessingColumn]
      );
      if (existingProcessing === processing) {
        excludedCount++;
        continue;
      }
    }

    allData.push({
      ЦС: normalizeValue(row[deliveryCsColumn]),
      Код: normalizeValue(row[deliveryCodeColumn]),
      Тип: "",
      Организация: "",
      "Предварительная обработка": "",
      Обработка: processing,
      "Заключительная обработка": "",
      Статус: "",
      Сообщение: "",
    });
  }

  (allData as any).__meta = {
    matchedCount,
    excludedCount,
    excludedAll: matchedCount > 0 && excludedCount === matchedCount,
  };

  console.log(`DKC1200: сформировано ${allData.length} строк данных`);
  return allData;
};

// DKC 1100: как DKC1200, но с иными валидными "Отделение"
export const buildDkc1100AllData = (
  deliveryTimeData: any[],
  deliveryData: any[],
): any[] => {
  // DKC1100: похож на DKC1200, но с собственным списком валидных отделений.
  if (!deliveryTimeData || deliveryTimeData.length === 0) {
    console.log("DKC1100: DeliveryTimeData пуст");
    return [];
  }
  if (!deliveryData || deliveryData.length === 0) {
    console.log("DKC1100: DeliveryData пуст");
    return [];
  }

  const firstDeliveryRow = deliveryData[0];
  const deliveryArticleColumn = findExactColumn(firstDeliveryRow, "Артикул");
  const deliveryCodeColumn = findExactColumn(firstDeliveryRow, "Код");
  const deliveryCsColumn = findCsColumn(firstDeliveryRow);
  const deliveryDepartmentColumn = findDepartmentColumn(firstDeliveryRow);
  const deliveryProcessingColumn = findExactColumn(firstDeliveryRow, "Обработка");

  if (!deliveryArticleColumn) {
    console.log('DKC1100: столбец "Артикул" не найден в DeliveryData');
    return [];
  }
  if (!deliveryCodeColumn) {
    console.log('DKC1100: столбец "Код" не найден в DeliveryData');
    return [];
  }
  if (!deliveryCsColumn) {
    console.log('DKC1100: столбец "ЦС" не найден в DeliveryData');
    return [];
  }
  if (!deliveryDepartmentColumn) {
    console.log('DKC1100: столбец "Отделение" не найден в DeliveryData');
    return [];
  }

  const firstTimeRow = deliveryTimeData[0];
  const timeCodeColumn =
    findExactColumn(firstTimeRow, "Код") ?? findCodeColumnInDeliveryData(firstTimeRow);
  if (!timeCodeColumn) {
    console.log('DKC1100: столбец "Код" не найден в DeliveryTime');
    return [];
  }

  const timeProcessingColumn = findDkc1200ProcessingColumn(firstTimeRow);
  if (!timeProcessingColumn) {
    console.log(
      'DKC1100: столбец "Средний срок поставки, дни" не найден в DeliveryTime',
    );
    return [];
  }

  const normalizeDkcProcessingValue = (value: any): string => {
    const processed = processProcessingValue(value);
    const num = parseFloat(processed.replace(",", "."));
    if (!isNaN(num) && num >= 900 && num <= 999) {
      return "!!!";
    }
    return processed;
  };

  const normalizeDepartment = (value: any): string => {
    const v = normalizeValue(value).toLowerCase();
    // убираем кавычки, которые часто встречаются в Excel
    return v.replace(/["«»]/g, "").trim();
  };

  // Map: Код(DeliveryTime) -> срок
  const timeCodeToProcessing = new Map<string, string>();
  for (let i = 0; i < deliveryTimeData.length; i++) {
    const row = deliveryTimeData[i];
    const code = normalizeValue(row[timeCodeColumn]);
    if (!code) continue;
    const processing = normalizeDkcProcessingValue(row[timeProcessingColumn]);
    timeCodeToProcessing.set(code, processing);
  }

  const validDepartments = new Set<string>([
    'ао диэлектрич',
    'дкс_перемерки',
  ]);

  const allData: any[] = [];
  let matchedCount = 0; // кандидаты, у которых найден срок по коду/артикулу
  let excludedCount = 0; // кандидаты, которые исключили из-за совпадения "Обработка"

  for (let i = 0; i < deliveryData.length; i++) {
    const row = deliveryData[i];
    const article = normalizeValue(row[deliveryArticleColumn]);
    if (!article) continue;

    const department = normalizeDepartment(row[deliveryDepartmentColumn]);
    if (!validDepartments.has(department)) continue;

    const processing = timeCodeToProcessing.get(article);
    if (!processing) continue;
    matchedCount++;

    if (deliveryProcessingColumn) {
      const existingProcessing = normalizeDkcProcessingValue(
        row[deliveryProcessingColumn],
      );
      if (existingProcessing === processing) {
        excludedCount++;
        continue;
      }
    }

    allData.push({
      ЦС: normalizeValue(row[deliveryCsColumn]),
      Код: normalizeValue(row[deliveryCodeColumn]),
      Тип: "",
      Организация: "",
      "Предварительная обработка": "",
      Обработка: processing,
      "Заключительная обработка": "",
      Статус: "",
      Сообщение: "",
    });
  }

  (allData as any).__meta = {
    matchedCount,
    excludedCount,
    excludedAll: matchedCount > 0 && excludedCount === matchedCount,
  };

  console.log(`DKC1100: сформировано ${allData.length} строк данных`);
  return allData;
};

// ===== ЛОГИКА ДЛЯ ExclusionFileBetterman =====

export const buildBettermanAllData = (
  deliveryTimeData: any[],
  deliveryData: any[],
): any[] => {
  // Betterman:
  // - срок "Обработка" вычисляется через "Категория поставки" (A/B/C/D),
  // - сравнивается с текущим значением в DeliveryData,
  // - в результат идут только реальные изменения.
  if (!deliveryTimeData || deliveryTimeData.length === 0) {
    console.log("Betterman: DeliveryTimeData пуст");
    return [];
  }
  if (!deliveryData || deliveryData.length === 0) {
    console.log("Betterman: DeliveryData пуст");
    return [];
  }

  const firstTimeRow = deliveryTimeData[0];
  const timeArticleColumn = findExactColumn(firstTimeRow, "Артикул");
  const timeCategoryColumn = findExactColumn(firstTimeRow, "Категория поставки");

  if (!timeArticleColumn) {
    console.log('Betterman: столбец "Артикул" не найден в DeliveryTime');
    return [];
  }
  if (!timeCategoryColumn) {
    console.log('Betterman: столбец "Категория поставки" не найден в DeliveryTime');
    return [];
  }

  const firstDeliveryRow = deliveryData[0];
  const deliveryArticleColumn = findExactColumn(firstDeliveryRow, "Артикул");
  const deliveryCodeColumn = findExactColumn(firstDeliveryRow, "Код");
  const deliveryExistingProcessingColumn =
    findExactColumn(firstDeliveryRow, "Срок Готовн Отгр (Обработка)") ??
    findExactColumn(firstDeliveryRow, "Срок готовн отгр (обработка)");

  if (!deliveryArticleColumn) {
    console.log('Betterman: столбец "Артикул" не найден в DeliveryData');
    return [];
  }
  if (!deliveryCodeColumn) {
    console.log('Betterman: столбец "Код" не найден в DeliveryData');
    return [];
  }

  const mapCategoryToProcessing = (value: any): string => {
    const v = normalizeValue(value).toUpperCase();
    if (v === "A") return "21";
    if (v === "B") return "42";
    if (v === "C") return "77";
    if (v === "D") return "!!!";
    return "!!!";
  };

  // Map: Артикул(DeliveryTime) -> Обработка(по категории поставки)
  const timeArticleToProcessing = new Map<string, string>();
  for (let i = 0; i < deliveryTimeData.length; i++) {
    const row = deliveryTimeData[i];
    const article = normalizeValue(row[timeArticleColumn]);
    if (!article) continue;
    timeArticleToProcessing.set(article, mapCategoryToProcessing(row[timeCategoryColumn]));
  }

  const allData: any[] = [];
  const csValues = ["R01", "R31", "R77", "R04", "R02", "R29", "R19", "V30"];

  // Сначала собираем валидные совпадения (без дублирования по ЦС),
  // затем раскладываем по ЦС так, чтобы в файле блоками шли R01, затем R31 и т.д.
  const matchedRows: Array<{ code: string; processing: string }> = [];
  let matchedCount = 0; // кандидаты, у которых есть код и рассчитана "Обработка"
  let excludedCount = 0; // кандидаты, которые исключили из-за совпадения "Обработка"

  for (let i = 0; i < deliveryData.length; i++) {
    const row = deliveryData[i];
    const article = normalizeValue(row[deliveryArticleColumn]);
    if (!article) continue;

    const processing = timeArticleToProcessing.get(article);
    if (!processing) continue;

    const code = normalizeValue(row[deliveryCodeColumn]);
    if (!code) continue;

    matchedCount++;

    // Если в DeliveryData уже есть значение "Срок Готовн Отгр (Обработка)" и оно совпадает
    // с рассчитанной "Обработка" — строку не добавляем
    if (deliveryExistingProcessingColumn) {
      const existing = processProcessingValue(row[deliveryExistingProcessingColumn]);
      if (existing === processing) {
        excludedCount++;
        continue;
      }
    }

    matchedRows.push({ code, processing });
  }

  for (const cs of csValues) {
    for (const item of matchedRows) {
      allData.push({
        ЦС: cs,
        Код: item.code,
        Тип: "",
        Организация: "",
        "Предварительная обработка": "",
        Обработка: item.processing,
        "Заключительная обработка": "",
        Статус: "",
        Сообщение: "",
      });
    }
  }

  (allData as any).__meta = {
    matchedCount,
    excludedCount,
    excludedAll: matchedCount > 0 && excludedCount === matchedCount,
  };

  console.log(`Betterman: сформировано ${allData.length} строк данных`);
  return allData;
};


