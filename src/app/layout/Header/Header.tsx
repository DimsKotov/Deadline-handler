import { useState, useRef, useEffect } from "react";
import styles from "./Header.module.css";

const Header = () => {
  const [showInstruction, setShowInstruction] = useState(false);
  const [animateInstruction, setAnimateInstruction] = useState(false); // для анимации
  const instructionRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleButtonClick = () => {
    if (!showInstruction) {
      setShowInstruction(true);
      // запуск анимации появления с небольшой задержкой
      setTimeout(() => setAnimateInstruction(true), 10);
    } else {
      // запуск анимации исчезновения
      setAnimateInstruction(false);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      showInstruction &&
      instructionRef.current &&
      !instructionRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      // запуск анимации исчезновения
      setAnimateInstruction(false);
    }
  };

  useEffect(() => {
    if (animateInstruction) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      // после окончания анимации скрываем компонент полностью
      const timeout = setTimeout(() => {
        if (!animateInstruction) {
          setShowInstruction(false);
        }
      }, 300); // длительность transition в CSS

      return () => clearTimeout(timeout);
    }
  }, [animateInstruction]);

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <img
          className={styles.headerImg}
          src="/src/assets/images/icon-excel.png"
          alt="Excel Icon"
        />
        <span className={styles.title}>Обработчик сроков готовности</span>
      </div>
      <div className={styles.buttonWrapper}>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className={styles.instructionButton}
        >
          Инструкция
        </button>
      </div>

      {showInstruction && (
        <div
          ref={instructionRef}
          className={`${styles.instructionModal} ${
            animateInstruction ? styles.show : ""
          }`}
        >
          <ul className={styles.instructionUl}>
            <li>1. Сформируйте отчет из BI "Данные о поставках, планирование" по нужному поставщику, выгружать достаточно по одному ЦС. Загрузите в первое окно полученный файл Excel. </li>
            <li>2. Загрузите во второе окно файл Excel со сроками от поставщика.</li>
            <li>3. Нажмите кнопку "Сформировать файл APEX" и дождитесь окончания операции.</li>
            <li>4. Выберите папку для сохранения файла. Файл полностью готов для загрузки в APEX.</li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
