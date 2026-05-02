import type { Repair } from "../types/repair";

type RepairListProps = {
  repairs: Repair[];
  onNewRepair: () => void;
};

const statusLabel: Record<Repair["status"], string> = {
  nowa: "Nowa",
  diagnoza: "Diagnoza",
  "w naprawie": "W naprawie",
  gotowa: "Gotowa",
  wydana: "Wydana",
};

export function RepairList({ repairs, onNewRepair }: RepairListProps) {
  return (
    <div className="repair-list">
      <header className="repair-list__toolbar">
        <div>
          <h2 className="repair-list__title">Naprawy</h2>
          <p className="repair-list__meta">{repairs.length} pozycji</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onNewRepair}>
          Nowa naprawa
        </button>
      </header>

      {repairs.length === 0 ? (
        <p className="empty-state">Brak napraw. Dodaj pierwszą pozycję.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Typ</th>
                <th>Marka</th>
                <th>Model</th>
                <th>Płyta</th>
                <th>Objaw</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((r) => (
                <tr key={r.id}>
                  <td className="mono" title={r.id}>
                    {r.id.slice(0, 8)}…
                  </td>
                  <td>{r.device_type}</td>
                  <td>{r.brand}</td>
                  <td>{r.model}</td>
                  <td className="muted">{r.motherboard || "—"}</td>
                  <td className="symptom-cell">{r.symptom}</td>
                  <td>
                    <span className={`badge badge--${r.status.replace(/\s/g, "-")}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
