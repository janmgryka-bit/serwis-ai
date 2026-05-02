import { useState } from "react";
import type { RepairDraft } from "../types/repair";

type RepairFormProps = {
  onSave: (draft: RepairDraft) => void;
  onCancel: () => void;
};

const emptyDraft: RepairDraft = {
  device_type: "",
  brand: "",
  model: "",
  motherboard: "",
  symptom: "",
};

export function RepairForm({ onSave, onCancel }: RepairFormProps) {
  const [draft, setDraft] = useState<RepairDraft>(emptyDraft);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed: RepairDraft = {
      device_type: draft.device_type.trim(),
      brand: draft.brand.trim(),
      model: draft.model.trim(),
      motherboard: draft.motherboard.trim(),
      symptom: draft.symptom.trim(),
    };
    if (!trimmed.device_type || !trimmed.brand || !trimmed.symptom) {
      return;
    }
    onSave(trimmed);
  }

  function field<K extends keyof RepairDraft>(key: K, label: string, required?: boolean) {
    return (
      <label className="field">
        <span className="field__label">
          {label}
          {required ? <span className="field__req"> *</span> : null}
        </span>
        <input
          className="input"
          value={draft[key]}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          required={Boolean(required)}
          autoComplete="off"
        />
      </label>
    );
  }

  return (
    <div className="repair-form">
      <header className="repair-form__header">
        <h2 className="repair-form__title">Nowa naprawa</h2>
        <p className="repair-form__hint">Wymagane: typ urządzenia, marka, objaw.</p>
      </header>

      <form className="repair-form__body" onSubmit={handleSubmit}>
        {field("device_type", "Typ urządzenia", true)}
        {field("brand", "Marka", true)}
        {field("model", "Model")}
        {field("motherboard", "Płyta główna")}
        <label className="field">
          <span className="field__label">
            Objaw <span className="field__req"> *</span>
          </span>
          <textarea
            className="input input--area"
            value={draft.symptom}
            onChange={(e) => setDraft((d) => ({ ...d, symptom: e.target.value }))}
            required
            rows={4}
            placeholder="Opis usterki…"
          />
        </label>

        <div className="repair-form__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Anuluj
          </button>
          <button type="submit" className="btn btn--primary">
            Zapisz
          </button>
        </div>
      </form>
    </div>
  );
}
