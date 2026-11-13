import { useState } from "react";
import RegisterFarmer from "./pages/RegisterFarmer.jsx";
import AddData from "./pages/AddData.jsx";

export default function App() {
  // Step 1 is farmer registration; step 2 is adding data for a farmer
  const [page, setPage] = useState("register");
  const [farmerId, setFarmerId] = useState("");

  const goAddData = (id = "") => {
    setFarmerId(String(id));
    setPage("data");
  };

  return (
    <div className="app">
      <header>
        <h1>Tractor Farmers</h1>
        <nav>
          <button className={page === "register" ? "tab active" : "tab"} onClick={() => setPage("register")}>
            1. Register Farmer
          </button>
          <button className={page === "data" ? "tab active" : "tab"} onClick={() => goAddData(farmerId)}>
            2. Add Data
          </button>
        </nav>
      </header>

      <main>
        {page === "register" ? (
          <RegisterFarmer onAddData={goAddData} />
        ) : (
          <AddData farmerId={farmerId} setFarmerId={setFarmerId} />
        )}
      </main>
    </div>
  );
}
