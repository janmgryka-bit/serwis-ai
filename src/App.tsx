import { useEffect, useState } from "react";
import { Box, Container, Group, Text, Title } from "@mantine/core";
import { RepairList } from "./components/RepairList";
import { RepairForm } from "./components/RepairForm";
import { RepairDetails } from "./components/RepairDetails";
import { useLocalStorageRepairs } from "./hooks/useLocalStorageRepairs";
import { buildDiagnosticStepsForSymptom } from "./lib/powerDiagnosticChecklist";
import { type Repair, type RepairDraft, DEFAULT_REPAIR_DOCUMENTATION } from "./types/repair";

const initialRepairs: Repair[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    customerName: "Jan Kowalski",
    customerPhone: "+48 600 100 200",
    orderNumber: "SRV-1700000000001",
    device_type: "Laptop",
    brand: "Dell",
    model: "Latitude 5520",
    motherboard: "LA-J091P",
    symptom: "Brak obrazu po rozgrzaniu, artefakty na zewnętrznym monitorze.",
    status: "diagnoza",
    notes: "",
    finalDiagnosis: "",
    solution: "",
    diagnosticSteps: [],
    diagnosisSteps: [],
    documentation: { ...DEFAULT_REPAIR_DOCUMENTATION },
    diagnosticMode: "no_display",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    customerName: "Anna Nowak",
    customerPhone: "",
    orderNumber: "SRV-1700000000002",
    device_type: "PC stacjonarny",
    brand: "Custom",
    model: "B450 / Ryzen 5",
    motherboard: "MSI B450 Tomahawk",
    symptom: "Laptop nie uruchamia się — brak reakcji po wciśnięciu power.",
    status: "w naprawie",
    notes: "",
    finalDiagnosis: "",
    solution: "",
    diagnosticSteps: buildDiagnosticStepsForSymptom(
      "Laptop nie uruchamia się — brak reakcji po wciśnięciu power.",
    ),
    documentation: { ...DEFAULT_REPAIR_DOCUMENTATION },
    diagnosticMode: "no_power",
    diagnosisSteps: [],
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    customerName: "",
    customerPhone: "22 123 45 67",
    orderNumber: "SRV-1700000000003",
    device_type: "AIO",
    brand: "HP",
    model: "24-dp1000",
    motherboard: "—",
    symptom: "Wolny start, dysk SMART ostrzeżenie.",
    status: "nowa",
    notes: "",
    finalDiagnosis: "",
    solution: "",
    diagnosticSteps: [],
    diagnosisSteps: [],
    documentation: { ...DEFAULT_REPAIR_DOCUMENTATION },
    diagnosticMode: "other",
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
      orderNumber: `SRV-${Date.now()}`,
      customerName: draft.customerName.trim(),
      customerPhone: draft.customerPhone.trim(),
      status: "nowa",
      notes: "",
      finalDiagnosis: draft.finalDiagnosis.trim(),
      solution: draft.solution.trim(),
      diagnosticSteps: buildDiagnosticStepsForSymptom(draft.symptom),
      diagnosisSteps: draft.diagnosisSteps ?? [],
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
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        component="header"
        py="sm"
        style={{
          borderBottom: "1px solid var(--mantine-color-dark-4)",
          background: "linear-gradient(180deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)",
        }}
      >
        <Container size="xl" px={{ base: "sm", sm: "md" }}>
          <Group gap="md" align="center" wrap="nowrap">
            <Text component="span" size="xl" c="teal.4" aria-hidden>
              ◈
            </Text>
            <Box>
              <Title order={2} size="h4">
                Serwis AI
              </Title>
              <Text size="xs" c="dimmed" ff="monospace" mt={2}>
                Rejestr napraw · lokalny stan
              </Text>
            </Box>
          </Group>
        </Container>
      </Box>

      <Box
        component="main"
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box style={{ flex: 1, minWidth: 0, width: "100%" }}>
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
        </Box>
      </Box>
    </Box>
  );
}

export default App;
