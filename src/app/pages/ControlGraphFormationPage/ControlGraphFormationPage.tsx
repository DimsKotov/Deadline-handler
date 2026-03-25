import { useMemo, useState } from "react";
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

export default function ControlGraphFormationPage() {
  // Текущие значения по умолчанию
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // Делаем список лет небольшой "полкой" вокруг текущего года.
  const years = useMemo(() => {
    const from = currentYear - 3;
    const to = currentYear + 1;
    const out: number[] = [];
    for (let y = from; y <= to; y++) out.push(y);
    return out;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Формирование контроля графика</h2>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Год</span>
          <select
            className={styles.select}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Месяц</span>
          <select
            className={styles.select}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {monthNames.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.summary}>
        Выбран период: {selectedYear} / {monthNames[selectedMonth]}
      </div>
    </div>
  );
}

