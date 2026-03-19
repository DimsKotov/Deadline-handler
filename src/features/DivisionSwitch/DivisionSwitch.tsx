import React, { useEffect, useState } from 'react';
import styles from './DivisionSwitch.module.css';

interface DivisionSwitchProps {
  /**
   * Текущее состояние переключателя
   */
  isEnabled?: boolean;
  
  /**
   * Обработчик изменения состояния переключателя
   */
  onChange?: (isEnabled: boolean) => void;
  supplierName?: string;
  onSupplierNameChange?: (value: string) => void;
  splitRowsLimit?: number;
  onSplitRowsLimitChange?: (value: number) => void;
  
  /**
   * Дополнительный CSS-класс
   */
  className?: string;
}

/**
 * Компонент переключателя для управления разбиением файлов на части
 * По умолчанию включен (true) - файлы разбиваются на части
 * При выключении (false) - файлы формируются одним файлом
 */
const DivisionSwitch: React.FC<DivisionSwitchProps> = ({
  isEnabled = true,
  onChange,
  supplierName = '',
  onSupplierNameChange,
  splitRowsLimit = 9990,
  onSplitRowsLimitChange,
  className = ''
}) => {
  const [enabled, setEnabled] = useState<boolean>(isEnabled);
  const [splitRowsInput, setSplitRowsInput] = useState<string>(String(splitRowsLimit));

  useEffect(() => {
    setSplitRowsInput(String(splitRowsLimit));
  }, [splitRowsLimit]);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    
    if (onChange) {
      onChange(newState);
    }
  };

  // Определяем текст в зависимости от состояния
  const getSwitchLabel = () => {
    return enabled ? 'Разбивать файл' : 'Не разбивать файл';
  };

  // Определяем описание в зависимости от состояния
  const getSwitchDescription = () => {
    return enabled 
      ? 'Файл будет разбит на части при превышении лимита строк' 
      : 'Файл будет сформирован без разбития';
  };

  const handleSupplierInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSupplierNameChange?.(e.target.value);
  };

  const handleSplitRowsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setSplitRowsInput(raw);
    if (raw === '') {
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      onSplitRowsLimitChange?.(Math.floor(parsed));
    }
  };

  const handleSplitRowsBlur = () => {
    const trimmed = splitRowsInput.trim();
    if (trimmed === '') {
      setSplitRowsInput('9990');
      onSplitRowsLimitChange?.(9990);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSplitRowsInput(String(splitRowsLimit));
      return;
    }

    const normalized = String(Math.floor(parsed));
    setSplitRowsInput(normalized);
    onSplitRowsLimitChange?.(Math.floor(parsed));
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.labelContainer}>
        <span className={styles.label}>{getSwitchLabel()}</span>
        <span className={styles.description}>
          {getSwitchDescription()}
        </span>
      </div>
      
      <button
        type="button"
        className={`${styles.switch} ${enabled ? styles.enabled : styles.disabled}`}
        onClick={handleToggle}
        aria-label={getSwitchLabel()}
        aria-pressed={enabled}
      >
        <div className={styles.switchTrack}>
          <div className={styles.switchThumb} />
        </div>
      </button>
      <div className={styles.inputsBlock}>
        <label className={styles.inputLabel}>
          Название поставщика
          <input
            className={styles.input}
            type="text"
            placeholder="Напишите название поставщика"
            value={supplierName}
            onChange={handleSupplierInput}
          />
        </label>
        <label className={styles.inputLabel}>
          Разбить файлы по кол-ву строк
          <input
            className={styles.input}
            type="number"
            min={1}
            step={1}
            placeholder="По сколько строк разбить файл?"
            value={splitRowsInput}
            onChange={handleSplitRowsInput}
            onBlur={handleSplitRowsBlur}
          />
        </label>
      </div>
    </div>
  );
};

export default DivisionSwitch;