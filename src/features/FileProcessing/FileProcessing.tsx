import React, { useState, useEffect } from "react";
import styles from "./FileProcessing.module.css";
import ExcelJS from "exceljs"; // импортируем ExcelJS
import { saveAs } from "file-saver"; // для сохранения файла

interface FileProcessingProps {
  deliveryDataReady: boolean;
  deliveryTimeReady: boolean;
  deliveryData: any[];
  deliveryTimeData: any[];
}

const FileProcessing: React.FC<FileProcessingProps> = ({
  deliveryDataReady,
  deliveryTimeReady,
  deliveryData,
  deliveryTimeData,
}) => {
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    setIsButtonDisabled(!(deliveryDataReady && deliveryTimeReady));
  }, [deliveryDataReady, deliveryTimeReady]);

  const findColumn = (data: any[], keywords: string[]): string | null => {
    if (data.length === 0) return null;
    const columns = Object.keys(data[0]);
    for (const column of columns) {
      const colLower = column.toLowerCase();
      for (const keyword of keywords) {
        if (colLower.includes(keyword.toLowerCase())) {
          return column;
        }
      }
    }
    return null;
  };

  const generateApexTemplate = async () => {
    if (deliveryData.length === 0 || deliveryTimeData.length === 0) return;

    try {
      const csColumn = findColumn(deliveryData, ["цс"]);
      const articleColumn = findColumn(deliveryData, ["артикул"]);
      const codeColumnInFirst = findColumn(deliveryData, ["код"]);

      if (!csColumn || !articleColumn || !codeColumnInFirst) {
        alert("Не удалось найти необходимые столбцы в файле данных");
        return;
      }

      const codeColumnInSecond = findColumn(deliveryTimeData, ["код"]);
      const срокColumn = findColumn(deliveryTimeData, ["срок"]);
      if (!codeColumnInSecond || !срокColumn) {
        alert("В файле поставщика не найден столбец 'Код' или 'Срок'");
        return;
      }

      const csValues = ["R01", "R31", "R77", "R04", "R02", "R29", "R19"];
      const finalData: any[] = [];

      for (const csVal of csValues) {
        const block = deliveryData.reduce((acc: any[], row: any) => {
          const article = String(row[articleColumn] || "").trim();
          const codeFromFirst = String(row[codeColumnInFirst] || "").trim();
          const csValue = csVal;

          let matchedCode = "";
          let срокValue = "";

          for (const secondRow of deliveryTimeData) {
            const secondCode = String(secondRow[codeColumnInSecond] || "").trim();

            if (
              secondCode &&
              secondCode.toLowerCase() === article.toLowerCase()
            ) {
              matchedCode = codeFromFirst;
              срокValue = String(secondRow[срокColumn] || "").trim();
              break;
            }
          }

          if (matchedCode !== "") {
            acc.push({
              ЦС: csValue,
              Код: matchedCode,
              Тип: "",
              Организация: "",
              "Предварительная обработка": "",
              Обработка: срокValue,
              "Заключительная обработка": "",
              Статус: "",
              Сообщение: "",
            });
          }

          return acc;
        }, []);
        finalData.push(...block);
      }

      // Создаем книгу и лист
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Шаблон APEX");

      // Заголовки
      const headers = [
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

      worksheet.addRow(headers);

      for (const row of finalData) {
        const обработка = row["Обработка"];
        const обработкаDisplay =
          !isNaN(Number(обработка)) && обработка.trim() !== ""
            ? обработка
            : "!!!";

        worksheet.addRow([
          row["ЦС"],
          row["Код"],
          row["Тип"],
          row["Организация"],
          row["Предварительная обработка"],
          обработкаDisplay,
          row["Заключительная обработка"],
          row["Статус"],
          row["Сообщение"],
        ]);
      }

      // Генерируем файл и сохраняем
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "Шаблон для загрузки APEX.xlsx");
    } catch (error) {
      console.error("Ошибка при формировании файла:", error);
    }
  };

  const handleClick = () => {
    generateApexTemplate();
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.uploadButton}
        disabled={isButtonDisabled}
        onClick={handleClick}
      >
        Выгрузка файла APEX
      </button>
    </div>
  );
};

export default FileProcessing;