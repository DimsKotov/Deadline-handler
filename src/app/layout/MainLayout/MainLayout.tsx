import { useState } from 'react';
import styles from "./MainLayout.module.css";
import DeliveryData from "../../../features/DeliveryData/DeliveryData";
import DeliveryTime from "../../../features/DeliveryTime/DeliveryTime";
import FileProcessing from "../../../features/FileProcessing/FileProcessing";

function MainLayout() {
  const [deliveryDataReady, setDeliveryDataReady] = useState(false);
  const [deliveryTimeReady, setDeliveryTimeReady] = useState(false);

  const handleDataSuccess = () => {
    setDeliveryDataReady(true);
  };

  const handleDataReset = () => {
    setDeliveryDataReady(false);
  };

  const handleTimeSuccess = () => {
    setDeliveryTimeReady(true);
  };

  const handleTimeReset = () => {
    setDeliveryTimeReady(false);
  };

  return (
    <div>
      <div className={styles.mainContainer}>
        <DeliveryData onSuccess={handleDataSuccess} onReset={handleDataReset} />
        <DeliveryTime onSuccess={handleTimeSuccess} onReset={handleTimeReset} />
      </div>
      <FileProcessing
        deliveryDataReady={deliveryDataReady}
        deliveryTimeReady={deliveryTimeReady}
      />
    </div>
  );
}

export default MainLayout;