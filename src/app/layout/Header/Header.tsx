import Instruction from "../Instruction/Instruction";
import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";

const Header = () => {
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
          Обработчик сроков готовности
        </NavLink>
        <NavLink
          to="/control-graph"
          className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
        >
          Формирование контроля графика
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
          items={[
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
          ]}
        />
      </div>
    </header>
  );
};

export default Header;
