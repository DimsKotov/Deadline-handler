import "./App.css";
import Header from "../app/layout/Header/Header";
import MainLayout from "../app/layout/MainLayout/MainLayout";
import Footer from "../app/layout/Footer/Footer";
import { HashRouter } from "react-router-dom";

function App() {
  return (
    <HashRouter>
      <div className="appShell">
        <Header />
        <MainLayout />
        <Footer />
      </div>
    </HashRouter>
  );
}

export default App;
