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
          src={`${import.meta.env.BASE_URL}icon-excel.png`}
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
          className={`${styles.instructionModal} ${animateInstruction ? styles.show : ""
            }`}
        >
          <ul className={styles.instructionUl}>
            <li>
              1. Если вы получили данные по срокам от поставщика в нашем формате
              файла "Данные о поставках, планировании", то необходимо загрузить
              данный файл в первое окно и нажать кнопку "Сформировать файл
              APEX или НСИ".
            </li>
            <li>
              2. Если вы получили данные по срокам в виде прайса поставщика, то
              необходимо данный прайс загрузить в первое окно, далее выгрузить
              отчет из BI "Данные о поставках и планировании" в формате Excel и загрузить его во
              второе окно и нажать кнопку "Сформировать файл
              APEX или НСИ".
            </li>
            <li>
              Примечание: Если формируемый файл содержит более 10000 строк, то
              он автоматически будет разбит на части и поочередно сохранен. Разбитие по необходимому кол-ву строк регулирруется в поле "Разбить файл по кол-ву строк". Если разбитие по частям не требуется, переключите
              тумблер "Разбивать файл". Если требуется добавить к формируемому файлу название поставщика введите его в поле "Название поставщика".
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
