import { useState } from 'react';
import styles from "./MainLayout.module.css";
import DeliveryData from "../../../features/DeliveryData/DeliveryData";
import DeliveryTime from "../../../features/DeliveryTime/DeliveryTime";
import FileProcessing from "../../../features/FileProcessing/FileProcessing";

function MainLayout() {
  const [deliveryDataReady, setDeliveryDataReady] = useState(false);
  const [deliveryTimeReady, setDeliveryTimeReady] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [deliveryTimeData, setDeliveryTimeData] = useState<any[]>([]);

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
  };

  const handleTimeReset = () => {
    setDeliveryTimeData([]);
    setDeliveryTimeReady(false);
  };

  return (
    <div>
      <div className={styles.mainContainer}>
        <DeliveryData 
          onSuccess={handleDataSuccess} 
          onReset={handleDataReset} 
        />
        <DeliveryTime 
          onSuccess={handleTimeSuccess} 
          onReset={handleTimeReset} 
        />
      </div>
      <FileProcessing
        deliveryDataReady={deliveryDataReady}
        deliveryTimeReady={deliveryTimeReady}
        deliveryData={deliveryData}
        deliveryTimeData={deliveryTimeData}
      />
    </div>
  );
}

export default MainLayout;