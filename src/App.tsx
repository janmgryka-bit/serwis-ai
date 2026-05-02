import { useState } from "react";
import { RepairList } from "./components/RepairList";
import { RepairForm } from "./components/RepairForm";
import type { Repair, RepairDraft } from "./types/repair";
import "./App.css";

const initialRepairs: Repair[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    device_type: "Laptop",
    brand: "Dell",
    model: "Latitude 5520",
    motherboard: "LA-J091P",
    symptom: "Brak obrazu po rozgrzaniu, artefakty na zewnętrznym monitorze.",
    status: "diagnoza",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    device_type: "PC stacjonarny",
    brand: "Custom",
    model: "B450 / Ryzen 5",
    motherboard: "MSI B450 Tomahawk",
    symptom: "Pętla rozruchu, nie wchodzi do BIOS.",
    status: "w naprawie",
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    device_type: "AIO",
    brand: "HP",
    model: "24-dp1000",
    motherboard: "—",
    symptom: "Wolny start, dysk SMART ostrzeżenie.",
    status: "nowa",
  },
];

type View = "list" | "form";

function App() {
  const [repairs, setRepairs] = useState<Repair[]>(initialRepairs);
  const [view, setView] = useState<View>("list");

  function handleSave(draft: RepairDraft) {
    const newRepair: Repair = {
      ...draft,
      id: crypto.randomUUID(),
      status: "nowa",
    };
    setRepairs((prev) => [newRepair, ...prev]);
    setView("list");
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden>
            ◈
          </span>
          <div>
            <h1 className="app__title">Serwis AI</h1>
            <p className="app__tagline">Rejestr napraw · lokalny stan</p>
          </div>
        </div>
      </header>

      <main className="app__main">
        {view === "list" ? (
          <RepairList repairs={repairs} onNewRepair={() => setView("form")} />
        ) : (
          <RepairForm onSave={handleSave} onCancel={() => setView("list")} />
        )}
      </main>
    </div>
  );
}

export default App;
