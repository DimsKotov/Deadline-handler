import { useState } from "react";
import styles from "./MainLayout.module.css";
import DeliveryData from "../../../features/DeliveryData/DeliveryData";
import DeliveryTime from "../../../features/DeliveryTime/DeliveryTime";
import ProcessingButton from "../../../features/ProcessingButton/ProcessingButton";
import FileFormationOne from "../../../features/FileFormation/FileFormationOne";
import FileFormationTwo from "../../../features/FileFormation/FileFormationTwo";

function MainLayout() {
  const [deliveryDataReady, setDeliveryDataReady] = useState(false);
  const [deliveryTimeReady, setDeliveryTimeReady] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [deliveryTimeData, setDeliveryTimeData] = useState<any[]>([]);
  const [isDeliveryTimeLoaded, setIsDeliveryTimeLoaded] = useState(false);
  const [showFileFormationOne, setShowFileFormationOne] = useState(false);
  const [showFileFormationTwo, setShowFileFormationTwo] = useState(false);
  const [fileOneDownloadTrigger, setFileOneDownloadTrigger] = useState(0);
  const [fileTwoDownloadTrigger, setFileTwoDownloadTrigger] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDataSuccess = (data: any[]) => {
    setDeliveryData(data);
    setDeliveryDataReady(true);
  };

  const handleDataReset = () => {
    setDeliveryData([]);
    setDeliveryDataReady(false);
  };

  const handleTimeSuccess = (data: any[]) => {
    setDeliveryTimeData(data);
    setDeliveryTimeReady(true);
    setIsDeliveryTimeLoaded(true);
  };

  const handleTimeReset = () => {
    setDeliveryTimeData([]);
    setDeliveryTimeReady(false);
    setIsDeliveryTimeLoaded(false);
  };

  const handleButtonClick = () => {
    // логика обработки при нажатии
  };

  const handleShowFileFormationOne = () => {
    setIsProcessing(true); // ВКЛЮЧАЕМ Loader СРАЗУ
    setShowFileFormationOne(true);
    setFileOneDownloadTrigger(prev => prev + 1);
  };

  const handleShowFileFormationTwo = () => {
    setIsProcessing(true); // ВКЛЮЧАЕМ Loader СРАЗУ
    setShowFileFormationTwo(true);
    setFileTwoDownloadTrigger(prev => prev + 1);
  };

  const handleFileFormationOneComplete = (success: boolean) => {
    setIsProcessing(false); // ВЫКЛЮЧАЕМ Loader когда файл готов
    if (success) {
      console.log('Файл APEX успешно сформирован и предложен к скачиванию');
    } else {
      console.error('Ошибка при формировании файла APEX');
    }
  };

  const handleFileFormationTwoComplete = (success: boolean) => {
    setIsProcessing(false); // ВЫКЛЮЧАЕМ Loader когда файл готов
    if (success) {
      console.log('Файл APEX успешно сформирован и предложен к скачиванию');
    } else {
      console.error('Ошибка при формировании файла APEX');
    }
  };

  return (
    <div className={styles.mainContainerWrapper}>
      <div className={styles.mainContainer}>
        <DeliveryTime onSuccess={handleTimeSuccess} onReset={handleTimeReset} />
        <DeliveryData onSuccess={handleDataSuccess} onReset={handleDataReset} />
      </div>
      <div>
        <ProcessingButton
          label="Сформировать файл APEX"
          onClick={handleButtonClick}
          disabled={!isDeliveryTimeLoaded}
          deliveryDataLoaded={deliveryDataReady}
          deliveryTimeLoaded={deliveryTimeReady}
          showFileFormationOne={handleShowFileFormationOne}
          showFileFormationTwo={handleShowFileFormationTwo}
          isProcessing={isProcessing}
        />
      </div>
      {showFileFormationOne && (
        <FileFormationOne
          deliveryTimeData={deliveryTimeData}
          downloadTrigger={fileOneDownloadTrigger}
          onProcessingComplete={handleFileFormationOneComplete}
        />
      )}
      {showFileFormationTwo && (
        <FileFormationTwo
          deliveryTimeData={deliveryTimeData}
          deliveryData={deliveryData}
          downloadTrigger={fileTwoDownloadTrigger}
          onProcessingComplete={handleFileFormationTwoComplete}
        />
      )}
    </div>
  );
}

export default MainLayout;
