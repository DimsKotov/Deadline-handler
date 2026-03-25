import { useEffect, useRef, useState } from "react";
import styles from "./Instruction.module.css";

type InstructionProps = {
  // Текст кнопки открытия инструкции
  buttonText?: string;
  // Содержимое пунктов инструкции (каждый пункт — отдельный <li>)
  items: React.ReactNode[];
};

export default function Instruction({
  buttonText = "Инструкция",
  items,
}: InstructionProps) {
  // UI-состояние модального окна инструкции
  const [showInstruction, setShowInstruction] = useState(false);
  const [animateInstruction, setAnimateInstruction] = useState(false); // для анимации

  const instructionRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleButtonClick = () => {
    // Переключаем состояние: открыть -> показать с анимацией, закрыть -> скрыть
    if (!showInstruction) {
      setShowInstruction(true);
      setTimeout(() => setAnimateInstruction(true), 10);
    } else {
      setAnimateInstruction(false);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    // Закрываем модалку по клику вне её области и вне кнопки.
    if (
      showInstruction &&
      instructionRef.current &&
      !instructionRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setAnimateInstruction(false);
    }
  };

  useEffect(() => {
    if (animateInstruction) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);

      // После окончания transition скрываем компонент полностью,
      // чтобы он не занимал место и не перехватывал клики.
      const timeout = window.setTimeout(() => {
        if (!animateInstruction) setShowInstruction(false);
      }, 300);

      return () => window.clearTimeout(timeout);
    }
  }, [animateInstruction]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className={styles.instructionButton}
        type="button"
      >
        {buttonText}
      </button>

      {showInstruction && (
        <div
          ref={instructionRef}
          className={`${styles.instructionModal} ${animateInstruction ? styles.show : ""}`}
        >
          <ul className={styles.instructionUl}>
            {items.map((node, idx) => (
              <li key={idx}>{node}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

