import React, { useState } from 'react';
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
  className = ''
}) => {
  const [enabled, setEnabled] = useState<boolean>(isEnabled);

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
    </div>
  );
};

export default DivisionSwitch;