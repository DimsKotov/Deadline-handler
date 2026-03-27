import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../../../features/Loader/Loader";
import { downloadBlob } from "../../../utils/ExcelUtils";
import styles from "../ControlGraphFormationPage/ControlGraphFormationPage.module.css";
import { buildDispatcherWindowsBlob, monthNames } from "./dispatcherWindowsService";

type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const suppressTriggerRef = useRef(false);

  const selected = options.find((o) => o.value === value);

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

export default function DispatcherWindowsFormationPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const nextMonth = (currentMonth + 1) % 12;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const years = useMemo(() => {
    const from = currentYear;
    const to = currentYear + 10;
    const out: number[] = [];
    for (let y = from; y <= to; y++) out.push(y);
    return out;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(nextMonthYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(nextMonth);
  const [useProductionCalendar, setUseProductionCalendar] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localError, setLocalError] = useState("");

  const yearOptions: DropdownOption<number>[] = useMemo(
    () => years.map((y) => ({ value: y, label: String(y) })),
    [years]
  );
  const monthOptions: DropdownOption<number>[] = useMemo(
    () => monthNames.map((m, idx) => ({ value: idx, label: m })),
    []
  );

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setLocalError("");

    try {
      const blob = await buildDispatcherWindowsBlob(selectedYear, selectedMonth, useProductionCalendar);
      const fileName = `Окна диспетчера (${monthNames[selectedMonth]} ${selectedYear}).xlsx`;
      await downloadBlob(blob, fileName);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Ошибка при формировании файла.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Год</span>
          <Dropdown<number> value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Месяц</span>
          <Dropdown<number> value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />
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
        <button className={styles.uploadButton} type="button" onClick={handleGenerate}>
          Сформировать окна диспетчера
        </button>
      )}

      {localError && <div className={styles.localError}>{localError}</div>}
    </div>
  );
}