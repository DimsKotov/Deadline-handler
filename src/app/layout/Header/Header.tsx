import Instruction from "../Instruction/Instruction";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./Header.module.css";

const Header = () => {
  const { pathname } = useLocation();

  const instructionItems =
    pathname === "/control-graph"
      ? [
          <>
            1. Выберите необходимый год и месяц для формируемого файла.
          </>,
          <>
            2. Нажмите кнопку &quot;Сформировать данные контроля&quot; — сформированный
            файл автоматически сохранится.
          </>,
          <>
            Примечание: По умолчанию файл будет сформирован по производственному
            календарю. Если необходимо сформировать файл с праздничными днями —
            переключите тумблер &quot;Использовать производственный календарь&quot;.
          </>,
        ]
      : pathname === "/dispatcher-windows"
        ? [
            <>
              1. Для формирования файла &quot;Окна диспетчера&quot; необходимо выбрать нужный
              год и месяц.
            </>,
            <>
              2. Нажимаем кнопку &quot;Сформировать окна диспетчера&quot;.
            </>,
            <>
              Примечание: Если необходимо сформировать файл вместе с праздничными
              днями, переключите тумблер &quot;Использовать производственный календарь&quot;.
            </>,
          ]
        : [
          <>
            1. Если вы получили данные по срокам от поставщика в нашем формате
            файла &quot;Данные о поставках, планировании&quot;, то необходимо
            загрузить данный файл в первое окно и нажать кнопку
            &quot;Сформировать файл APEX или НСИ&quot;.
          </>,
          <>
            2. Если вы получили данные по срокам в виде прайса поставщика, то
            необходимо данный прайс загрузить в первое окно, далее выгрузить
            отчет из BI &quot;Данные о поставках и планировании&quot; в формате
            Excel по одному складу и загрузить его во второе окно и нажать
            кнопку &quot;Сформировать файл APEX или НСИ&quot;.
          </>,
          <>
            Примечание: Если формируемый файл содержит более 9990 строк, то он
            автоматически будет разбит на части и поочередно сохранен. Разбитие
            по необходимому кол-ву строк регулирруется в поле &quot;Разбить
            файл по кол-ву строк&quot;. Если разбитие по частям не требуется,
            переключите тумблер &quot;Разбивать файл&quot;. Если требуется
            добавить к формируемому файлу название поставщика введите его в
            поле &quot;Название поставщика&quot;.
          </>,
        ];

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <img
          className={styles.headerImg}
          src={`${import.meta.env.BASE_URL}icon-excel.png`}
          alt="Excel Icon"
        />        
      </div>

      <nav className={styles.tabsBar} aria-label="Разделы приложения">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
        >
          Обработчик сроков обеспечения
        </NavLink>
        <NavLink
          to="/control-graph"
          className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
        >
          Формирование данных контроля
        </NavLink>
        <NavLink
          to="/dispatcher-windows"
          className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
        >
          Формирование окон диспетчера
        </NavLink>
      </nav>
      <div className={styles.buttonWrapper}>
        <Instruction
          items={instructionItems}
        />
      </div>
    </header>
  );
};

export default Header;
