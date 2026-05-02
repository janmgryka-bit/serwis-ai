import { useState } from "react";
import type { RepairDraft } from "../types/repair";
import {
  buildSymptomString,
  SYMPTOM_PRESET_OPTIONS,
  type SymptomPresetId,
} from "../lib/repairSymptomForm";

type RepairFormProps = {
  onSave: (draft: RepairDraft) => void;
  onCancel: () => void;
};

const emptyChecked: Record<SymptomPresetId, boolean> = {
  "brak-reakcji": false,
  "nie-uruchamia": false,
  restartuje: false,
  "brak-obrazu": false,
  zalanie: false,
};

const emptyFields = {
  device_type: "",
  brand: "",
  model: "",
  motherboard: "",
};

export function RepairForm({ onSave, onCancel }: RepairFormProps) {
  const [fields, setFields] = useState(emptyFields);
  const [symptomChecked, setSymptomChecked] = useState(emptyChecked);
  const [otherSymptom, setOtherSymptom] = useState("");

  function togglePreset(id: SymptomPresetId) {
    setSymptomChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const symptom = buildSymptomString(symptomChecked, otherSymptom);
    const trimmed: RepairDraft = {
      device_type: fields.device_type.trim(),
      brand: fields.brand.trim(),
      model: fields.model.trim(),
      motherboard: fields.motherboard.trim(),
      symptom: symptom.trim(),
    };
    if (!trimmed.device_type || !trimmed.brand || !trimmed.symptom) {
      return;
    }
    onSave(trimmed);
  }

  function field<K extends keyof typeof emptyFields>(key: K, label: string, required?: boolean) {
    return (
      <label className="field">
        <span className="field__label">
          {label}
          {required ? <span className="field__req"> *</span> : null}
        </span>
        <input
          className="input"
          value={fields[key]}
          onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
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
        <p className="repair-form__hint">
          Wymagane: typ urządzenia, marka oraz co najmniej jeden objaw (lista lub pole „Inny”).
        </p>
      </header>

      <form className="repair-form__body" onSubmit={handleSubmit}>
        {field("device_type", "Typ urządzenia", true)}
        {field("brand", "Marka", true)}
        {field("model", "Model")}
        {field("motherboard", "Płyta główna")}

        <div className="field repair-form__symptoms">
          <span className="field__label">
            Objawy <span className="field__req"> *</span>
          </span>
          <ul className="repair-form__symptom-list">
            {SYMPTOM_PRESET_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <label className="repair-form__symptom-item">
                  <input
                    type="checkbox"
                    className="repair-form__symptom-checkbox"
                    checked={symptomChecked[opt.id]}
                    onChange={() => togglePreset(opt.id)}
                  />
                  <span>{opt.phrase}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className="field">
          <span className="field__label">Inny objaw</span>
          <textarea
            className="input input--area"
            value={otherSymptom}
            onChange={(e) => setOtherSymptom(e.target.value)}
            rows={3}
            placeholder="Opcjonalny opis…"
            spellCheck={false}
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
