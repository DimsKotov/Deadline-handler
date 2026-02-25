import styles from "./MainLayout.module.css";
import DeliveryData from "../../../features/DeliveryData/DeliveryData";
import DeliveryTime from "../../../features/DeliveryTime/DeliveryTime";
// import FileProcessing from "../../../features/FileProcessing/FileProcessing";

function MainLayout() {
  return (
    <div className={styles.mainContainer}>
      <DeliveryData />
      <DeliveryTime />      
    </div>
  );
}

export default MainLayout;
