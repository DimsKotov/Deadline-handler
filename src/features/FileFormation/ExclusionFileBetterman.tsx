import React, { useEffect, useRef } from "react";
import { createExcelBlob, downloadBlob } from "../../utils/ExcelUtils";
import { buildBettermanAllData } from "./FileFormationService";

interface ExclusionFileBettermanProps {
  deliveryTimeData: any[];
  deliveryData: any[];
  downloadTrigger: number;
  onProcessingComplete?: (success: boolean) => void;
  splitFilesEnabled?: boolean;
  splitRowsLimit?: number;
  supplierName?: string;
}

const ExclusionFileBetterman: React.FC<ExclusionFileBettermanProps> = ({
  deliveryTimeData,
  deliveryData,
  downloadTrigger,
  onProcessingComplete,
  splitFilesEnabled = true,
  splitRowsLimit = 9990,
  supplierName = "",
}) => {
  const getApexFileName = (suffix?: string) => {
    const supplierPart = supplierName.trim() ? ` ${supplierName.trim()}` : "";
    const suffixPart = suffix ? ` ${suffix}` : "";
    return `Файл для загрузки APEX${supplierPart}${suffixPart}.xlsx`;
  };

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

  useEffect(() => {
    if (downloadTrigger !== lastTriggerRef.current) {
      hasDownloadedRef.current = false;
      lastTriggerRef.current = downloadTrigger;
    }

    if (
      deliveryTimeData &&
      deliveryTimeData.length > 0 &&
      deliveryData &&
      deliveryData.length > 0 &&
      !hasDownloadedRef.current
    ) {
      hasDownloadedRef.current = true;
      setTimeout(() => {
        handleDownload();
      }, 100);
    }
  }, [deliveryTimeData, deliveryData, downloadTrigger]);

  const handleDownload = async () => {
    try {
      console.time("ExclusionFileBetterman Processing");

      const allData = buildBettermanAllData(deliveryTimeData, deliveryData);

      if (allData.length === 0) {
        console.log("ExclusionFileBetterman: нет данных для формирования файла");
        if (onProcessingComplete) {
          onProcessingComplete(false);
        }
        return;
      }

      if (!splitFilesEnabled) {
        const blob = createExcelBlob(
          allData,
          EXCEL_HEADERS,
          "Импортированные данные"
        );
        const success = await downloadBlob(
          blob,
          getApexFileName("(Betterman)")
        );
        if (onProcessingComplete) {
          onProcessingComplete(success);
        }
      } else {
        const MAX_ROWS = splitRowsLimit;
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
          const fileName = getApexFileName(`(Betterman, часть ${part} из ${totalParts})`);
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

      console.timeEnd("ExclusionFileBetterman Processing");
    } catch (error) {
      console.error("Ошибка при формировании файла Betterman:", error);
      if (onProcessingComplete) {
        onProcessingComplete(false);
      }
    }
  };

  return null;
};

export default ExclusionFileBetterman;

