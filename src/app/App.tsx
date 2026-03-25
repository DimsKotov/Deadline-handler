import "./App.css";
import Header from "../app/layout/Header/Header";
import MainLayout from "../app/layout/MainLayout/MainLayout";
import Footer from "../app/layout/Footer/Footer";
import { BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="appShell">
        <Header />
        <MainLayout />
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
