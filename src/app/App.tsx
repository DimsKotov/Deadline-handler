import "./App.css";
import Header from "../app/layout/Header/Header";
import MainLayout from "../app/layout/MainLayout/MainLayout";
import Footer from "../app/layout/Footer/Footer";

function App() {
  return (
    <div className="appShell">
      <Header />
      <MainLayout />
      <Footer />
    </div>
  );
}

export default App;
