import { useEffect, useState } from "react";
import { RepairList } from "./components/RepairList";
import { RepairForm } from "./components/RepairForm";
import { RepairDetails } from "./components/RepairDetails";
import { useLocalStorageRepairs } from "./hooks/useLocalStorageRepairs";
import { buildDiagnosticStepsForSymptom } from "./lib/powerDiagnosticChecklist";
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
    notes: "",
    diagnosticSteps: [],
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    device_type: "PC stacjonarny",
    brand: "Custom",
    model: "B450 / Ryzen 5",
    motherboard: "MSI B450 Tomahawk",
    symptom: "Laptop nie uruchamia się — brak reakcji po wciśnięciu power.",
    status: "w naprawie",
    notes: "",
    diagnosticSteps: buildDiagnosticStepsForSymptom(
      "Laptop nie uruchamia się — brak reakcji po wciśnięciu power.",
    ),
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    device_type: "AIO",
    brand: "HP",
    model: "24-dp1000",
    motherboard: "—",
    symptom: "Wolny start, dysk SMART ostrzeżenie.",
    status: "nowa",
    notes: "",
    diagnosticSteps: [],
  },
];

type View = "list" | "form" | "details";

function App() {
  const [repairs, setRepairs] = useLocalStorageRepairs(initialRepairs);
  const [view, setView] = useState<View>("list");
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);

  function handleSave(draft: RepairDraft) {
    const newRepair: Repair = {
      ...draft,
      id: crypto.randomUUID(),
      status: "nowa",
      notes: "",
      diagnosticSteps: buildDiagnosticStepsForSymptom(draft.symptom),
    };
    setRepairs((prev) => [newRepair, ...prev]);
    setView("list");
  }

  const selectedRepair =
    selectedRepairId != null ? repairs.find((r) => r.id === selectedRepairId) : undefined;

  function goToList() {
    setSelectedRepairId(null);
    setView("list");
  }

  useEffect(() => {
    if (view === "details" && !selectedRepair) {
      setSelectedRepairId(null);
      setView("list");
    }
  }, [view, selectedRepair]);

  const openDetails = (r: Repair) => {
    setSelectedRepairId(r.id);
    setView("details");
  };

  function updateRepair(updatedRepair: Repair) {
    setRepairs((prev) => prev.map((r) => (r.id === updatedRepair.id ? updatedRepair : r)));
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
          <RepairList
            repairs={repairs}
            onNewRepair={() => setView("form")}
            onSelectRepair={openDetails}
          />
        ) : view === "form" ? (
          <RepairForm onSave={handleSave} onCancel={goToList} />
        ) : selectedRepair ? (
          <RepairDetails
            repair={selectedRepair}
            onBack={goToList}
            onUpdateRepair={updateRepair}
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
