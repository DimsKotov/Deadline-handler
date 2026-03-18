import React, { useEffect, useRef } from "react";
import { createExcelBlob, downloadBlob } from "../../utils/ExcelUtils";
import {
  buildDkc1100AllData,
  buildDkc1200AllData,
  buildDkcAllData,
} from "./FileFormationService";

interface ExclusionFileDKCProps {
  deliveryTimeData: any[];
  deliveryData: any[];
  deliveryTimeFileName: string | null; // имя файла из DeliveryTime
  deliveryTimeSources?: Array<{ name: string; data: any[] }>;
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
  splitFilesEnabled?: boolean;
}

const ExclusionFileDKC: React.FC<ExclusionFileDKCProps> = ({
  deliveryTimeData,
  deliveryData,
  deliveryTimeFileName,
  deliveryTimeSources = [],
  downloadTrigger,
  onProcessingComplete,
  splitFilesEnabled = true,
}) => {
  const hasDownloadedRef = useRef(false);
  const lastTriggerRef = useRef(downloadTrigger);

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

  const isDkc1200 = (): boolean => {
    if (!deliveryTimeFileName) return false;
    return deliveryTimeFileName.toLowerCase().includes("dkc maga del 1200");
  };

  const isDkc1100 = (): boolean => {
    if (!deliveryTimeFileName) return false;
    return deliveryTimeFileName.toLowerCase().includes("dkc maga del 1100");
  };

  const isBothDkc = (): boolean => {
    if (!deliveryTimeFileName) return false;
    const name = deliveryTimeFileName.toLowerCase();
    return name.includes("dkc maga del 1100") && name.includes("dkc maga del 1200");
  };

  const getAllowedCsForFile = (): string[] | null => {
    if (!deliveryTimeFileName) return null;
    const name = deliveryTimeFileName.toLowerCase();

    // Файл DKC 1200 — только R29, R19, R02
    if (name.includes("dkc maga del 1200".toLowerCase())) {
      return ["R29", "R19", "R02"];
    }

    // Файл DKC 1100 — используем стандартный набор ЦС
    if (name.includes("dkc maga del 1100".toLowerCase())) {
      return ["R01", "R31", "R77", "R04", "R02", "R29", "R19", "V30"];
    }

    // Если имя не подходит под DKC — не обрабатываем
    return null;
  };

  useEffect(() => {
    if (downloadTrigger !== lastTriggerRef.current) {
      hasDownloadedRef.current = false;
      lastTriggerRef.current = downloadTrigger;
    }

    const hasTimeData =
      (deliveryTimeData && deliveryTimeData.length > 0) ||
      (deliveryTimeSources && deliveryTimeSources.some((s) => s.data && s.data.length > 0));

    if (
      hasTimeData &&
      deliveryData &&
      deliveryData.length > 0 &&
      !hasDownloadedRef.current
    ) {
      hasDownloadedRef.current = true;
      setTimeout(() => {
        handleDownload();
      }, 100);
    }
  }, [deliveryTimeData, deliveryTimeSources, deliveryData, downloadTrigger]);

  const handleDownload = async () => {
    try {
      console.time("ExclusionFileDKC Processing");

      // DKC 1200/1100 — новый алгоритм (ЦС/Код из DeliveryData, срок из DeliveryTime)
      const allData = (() => {
        const pickSource = (needle: string): any[] | null => {
          const n = needle.toLowerCase();
          const found = deliveryTimeSources.find((s) =>
            (s.name || "").toLowerCase().includes(n),
          );
          return found?.data ?? null;
        };

        const dt1200 = pickSource("dkc maga del 1200") ?? deliveryTimeData;
        const dt1100 = pickSource("dkc maga del 1100") ?? deliveryTimeData;

        if (isBothDkc()) {
          const data1200 = buildDkc1200AllData(dt1200, deliveryData);
          const data1100 = buildDkc1100AllData(dt1100, deliveryData);

          // Дедупликация строк на случай пересечений
          const uniq = new Map<string, any>();
          for (const row of [...data1100, ...data1200]) {
            const key = `${row?.["ЦС"] ?? ""}|${row?.["Код"] ?? ""}|${row?.["Обработка"] ?? ""}`;
            if (!uniq.has(key)) uniq.set(key, row);
          }
          return Array.from(uniq.values());
        }

        if (isDkc1200()) {
          return buildDkc1200AllData(dt1200, deliveryData);
        }

        if (isDkc1100()) {
          return buildDkc1100AllData(dt1100, deliveryData);
        }

        const allowedCs = getAllowedCsForFile();
        if (!allowedCs || allowedCs.length === 0) {
          return [];
        }
        return buildDkcAllData(deliveryTimeData, deliveryData, allowedCs);
      })();

      if (allData.length === 0) {
        console.log("ExclusionFileDKC: нет данных для формирования файла");
        if (onProcessingComplete) {
          onProcessingComplete(false);
        }
        return;
      }

      const totalRows = allData.length;
      console.log(`ExclusionFileDKC: сформировано ${totalRows} строк данных`);

      const outputFileLabel = isBothDkc()
        ? "DKC Тверь + Сибирь"
        : isDkc1200()
          ? "DKC Сибирь"
          : isDkc1100()
            ? "DKC Тверь"
            : "DKC";

      if (!splitFilesEnabled) {
        // Один файл без разбиения
        const blob = createExcelBlob(
          allData,
          EXCEL_HEADERS,
          "Импортированные данные"
        );
        const success = await downloadBlob(
          blob,
          `Файл для загрузки APEX (${outputFileLabel}).xlsx`
        );

        if (onProcessingComplete) {
          onProcessingComplete(success);
        }
      } else {
        // Разбиение на части по 9990 строк
        const MAX_ROWS = 9990;
        const totalParts = Math.ceil(allData.length / MAX_ROWS);
        let allDownloadsSuccessful = true;

        for (let part = 1; part <= totalParts; part++) {
          const startIndex = (part - 1) * MAX_ROWS;
          const endIndex = Math.min(part * MAX_ROWS, allData.length);
          const partData = allData.slice(startIndex, endIndex);

          const blob = createExcelBlob(
            partData,
            EXCEL_HEADERS,
            "Импортированные данные"
          );
          const fileName = `Файл для загрузки APEX (${outputFileLabel}, часть ${part} из ${totalParts}).xlsx`;

          const success = await downloadBlob(blob, fileName);
          if (!success) {
            allDownloadsSuccessful = false;
          }

          if (part < totalParts) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        if (onProcessingComplete) {
          onProcessingComplete(allDownloadsSuccessful);
        }
      }

      console.timeEnd("ExclusionFileDKC Processing");
    } catch (error) {
      console.error("Ошибка при формировании файла DKC:", error);
      if (onProcessingComplete) {
        onProcessingComplete(false);
      }
    }
  };

  // Компонент не рендерит UI, только запускает обработку по триггеру
  return null;
};

export default ExclusionFileDKC;

