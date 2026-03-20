import { useState, useEffect } from "react";
import styles from "./MainLayout.module.css";
import DeliveryData from "../../../features/DeliveryData/DeliveryData";
import DeliveryTime from "../../../features/DeliveryTime/DeliveryTime";
import ProcessingButton from "../../../features/ProcessingButton/ProcessingButton";
import FileFormationOne from "../../../features/FileFormation/FileFormationOne";
import FileFormationTwo from "../../../features/FileFormation/FileFormationTwo";
import FileFormationNSI from "../../../features/FileFormation/FileFormationNSI.tsx";
import ErrorHandler from "../../../features/ErrorHandler/ErrorHandler";
import DivisionSwitch from "../../../features/DivisionSwitch/DivisionSwitch"; // Импорт нового компонента

function MainLayout() {
  const [deliveryDataReady, setDeliveryDataReady] = useState(false);
  const [deliveryTimeReady, setDeliveryTimeReady] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [deliveryTimeData, setDeliveryTimeData] = useState<any[]>([]);
  const [deliveryTimeFileName, setDeliveryTimeFileName] = useState<string | null>(null);
  const [deliveryTimeSources, setDeliveryTimeSources] = useState<
    Array<{ name: string; data: any[] }>
  >([]);
  const [isDeliveryTimeLoaded, setIsDeliveryTimeLoaded] = useState(false);
  const [showFileFormationOne, setShowFileFormationOne] = useState(false);
  const [showFileFormationTwo, setShowFileFormationTwo] = useState(false);
  const [showFileFormationNSI, setShowFileFormationNSI] = useState(false);
  const [fileOneDownloadTrigger, setFileOneDownloadTrigger] = useState(0);
  const [fileTwoDownloadTrigger, setFileTwoDownloadTrigger] = useState(0);
  const [fileNSIDownloadTrigger, setFileNSIDownloadTrigger] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // НОВОЕ: состояние для управления разбиением файлов
  const [splitFilesEnabled, setSplitFilesEnabled] = useState<boolean>(true);
  const [splitRowsLimit, setSplitRowsLimit] = useState<number>(9990);
  const [supplierName, setSupplierName] = useState<string>("");

  // Состояние для управления ошибками
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  // Обработчик события ошибки из FileFormationOne
  useEffect(() => {
    const handleFileFormationError = (event: CustomEvent) => {
      setErrorMessage(event.detail.message);
      setShowError(true);
    };

    // Добавляем обработчик события
    window.addEventListener(
      "fileFormationError",
      handleFileFormationError as EventListener,
    );

    // Очищаем обработчик при размонтировании
    return () => {
      window.removeEventListener(
        "fileFormationError",
        handleFileFormationError as EventListener,
      );
    };
  }, []);

  // Обработчик события информационных уведомлений из FileFormation*
  useEffect(() => {
    let timer: number | undefined;

    const handleFileFormationInfo = (event: CustomEvent) => {
      if (timer) window.clearTimeout(timer);
      setInfoMessage(event.detail.message);
      setShowInfo(true);
      setShowError(false);
      setErrorMessage("");
      // Чтобы не мешало, убираем через несколько секунд
      timer = window.setTimeout(() => {
        setShowInfo(false);
      }, 7000);
    };

    window.addEventListener(
      "fileFormationInfo",
      handleFileFormationInfo as EventListener,
    );

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(
        "fileFormationInfo",
        handleFileFormationInfo as EventListener,
      );
    };
  }, []);

  // НОВОЕ: обработчик изменения состояния переключателя
  const handleSplitToggle = (isEnabled: boolean) => {
    setSplitFilesEnabled(isEnabled);
    console.log(`Разбиение файлов: ${isEnabled ? "ВКЛЮЧЕНО" : "ВЫКЛЮЧЕНО"}`);
  };

  const handleSupplierNameChange = (value: string) => {
    setSupplierName(value);
  };

  const handleSplitRowsLimitChange = (value: number) => {
    if (Number.isFinite(value) && value > 0) {
      setSplitRowsLimit(Math.floor(value));
    }
  };

  const handleDataSuccess = (data: any[]) => {
    setDeliveryData(data);
    setDeliveryDataReady(true);
    // Очищаем ошибку при успешной загрузке нового файла
    setShowError(false);
    setErrorMessage("");
  };

  const handleDataReset = () => {
    setDeliveryData([]);
    setDeliveryDataReady(false);
    // Очищаем ошибку при сбросе данных
    setShowError(false);
    setErrorMessage("");
  };

  const handleTimeSuccess = (
    data: any[],
    fileName: string,
    sources: Array<{ name: string; data: any[] }>,
  ) => {
    setDeliveryTimeData(data);
    setDeliveryTimeReady(sources.length > 0);
    setIsDeliveryTimeLoaded(sources.length > 0);
    setDeliveryTimeFileName(fileName);
    setDeliveryTimeSources(sources);
    // Очищаем ошибку при успешной загрузке нового файла
    setShowError(false);
    setErrorMessage("");
  };

  const handleTimeReset = () => {
    setDeliveryTimeData([]);
    setDeliveryTimeReady(false);
    setIsDeliveryTimeLoaded(false);
    setDeliveryTimeFileName(null);
    setDeliveryTimeSources([]);
    // Очищаем ошибку при сбросе данных
    setShowError(false);
    setErrorMessage("");
  };

  const handleButtonClick = () => {
    // логика обработки при нажатии
  };

  // Функция для показа ошибки
  const showErrorHandler = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
  };

  const handleShowFileFormationOne = () => {
    setIsProcessing(true);
    setShowFileFormationOne(true);
    setFileOneDownloadTrigger((prev) => prev + 1);
    // Очищаем предыдущую ошибку перед началом новой обработки
    setShowError(false);
    setErrorMessage("");
  };

  const handleShowFileFormationTwo = () => {
    setIsProcessing(true);
    setShowFileFormationTwo(true);
    setFileTwoDownloadTrigger((prev) => prev + 1);
    // Очищаем предыдущую ошибку перед началом новой обработки
    setShowError(false);
    setErrorMessage("");
  };

  const handleShowFileFormationNSI = () => {
    setIsProcessing(true);
    setShowFileFormationNSI(true);
    setFileNSIDownloadTrigger((prev) => prev + 1);
    setShowError(false);
    setErrorMessage("");
  };

  const handleFileFormationOneComplete = (success: boolean) => {
    setIsProcessing(false);
    if (success) {
      console.log("Файл APEX успешно сформирован и предложен к скачиванию");
    } else {
      console.error("Ошибка при формировании файла APEX");
      // Показываем ошибку пользователю только если она еще не была показана
      if (!showError) {
        showErrorHandler("Ошибка при формировании файла APEX");
      }
    }
  };

  const handleFileFormationTwoComplete = (success: boolean) => {
    setIsProcessing(false);
    if (success) {
      console.log("Файл APEX успешно сформирован и предложен к скачиванию");
    } else {
      console.error("Ошибка при формировании файла APEX");
      // Показываем ошибку пользователю только если она еще не была показана
      if (!showError) {
        showErrorHandler("Ошибка при формировании файла APEX");
      }
    }
  };

  const handleFileFormationNSIComplete = (success: boolean) => {
    setIsProcessing(false);
    if (success) {
      console.log("Файл НСИ успешно сформирован и предложен к скачиванию");
    } else {
      console.error("Ошибка при формировании файла НСИ");
      if (!showError) {
        showErrorHandler("Ошибка при формировании файла НСИ");
      }
    }
  };

  return (
    <div className={styles.mainContainerWrapper}>
      <div className={styles.divisionSwitchWrapper}>
        <DivisionSwitch
          isEnabled={splitFilesEnabled}
          onChange={handleSplitToggle}
          supplierName={supplierName}
          onSupplierNameChange={handleSupplierNameChange}
          splitRowsLimit={splitRowsLimit}
          onSplitRowsLimitChange={handleSplitRowsLimitChange}
        />
      </div>
      <div className={styles.mainContainer}>
        <DeliveryTime onSuccess={handleTimeSuccess} onReset={handleTimeReset} />
        <DeliveryData onSuccess={handleDataSuccess} onReset={handleDataReset} />
      </div>
      <div>
        <ProcessingButton
          label="Сформировать файл APEX"
          nsiLabel="Сформировать файл НСИ"
          onClick={handleButtonClick}
          disabled={!isDeliveryTimeLoaded}
          deliveryDataLoaded={deliveryDataReady}
          deliveryTimeLoaded={deliveryTimeReady}
          showFileFormationOne={handleShowFileFormationOne}
          showFileFormationTwo={handleShowFileFormationTwo}
          showFileFormationNSI={handleShowFileFormationNSI}
          isProcessing={isProcessing}
        />
      </div>

      {/* ErrorHandler отображается только при showError = true */}
      {showError && (
        <div className={styles.errorHandler}>
          <ErrorHandler text={errorMessage} />
        </div>
      )}

      {/* Информационное уведомление (например, когда изменения отсутствуют) */}
      <div
        className={`${styles.infoHandler} ${showInfo ? styles.infoHandlerVisible : styles.infoHandlerHidden}`}
        aria-live="polite"
      >
        <p className={styles.infoTitle}>{infoMessage}</p>
      </div>

      {showFileFormationOne && (
        <FileFormationOne
          deliveryTimeData={deliveryTimeData}
          downloadTrigger={fileOneDownloadTrigger}
          onProcessingComplete={handleFileFormationOneComplete}
          splitFilesEnabled={splitFilesEnabled} // Передаем состояние в компонент
          splitRowsLimit={splitRowsLimit}
          supplierName={supplierName}
        />
      )}

      {showFileFormationTwo && (
        <FileFormationTwo
          deliveryTimeData={deliveryTimeData}
          deliveryData={deliveryData}
          deliveryTimeFileName={deliveryTimeFileName}
          deliveryTimeSources={deliveryTimeSources}
          downloadTrigger={fileTwoDownloadTrigger}
          onProcessingComplete={handleFileFormationTwoComplete}
          splitFilesEnabled={splitFilesEnabled} // Передаем состояние в компонент
          splitRowsLimit={splitRowsLimit}
          supplierName={supplierName}
        />
      )}
      {showFileFormationNSI && (
        <FileFormationNSI
          deliveryTimeData={deliveryTimeData}
          deliveryData={deliveryData}
          deliveryTimeFileName={deliveryTimeFileName}
          deliveryTimeSources={deliveryTimeSources}
          downloadTrigger={fileNSIDownloadTrigger}
          onProcessingComplete={handleFileFormationNSIComplete}
          supplierName={supplierName}
        />
      )}
    </div>
  );
}

export default MainLayout;
