import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import {
  getClassificationTypes,
  getClassificationTree,
  updateEntry,
  deleteEntry,
  exportClassification,
} from "../api/client";
import type { ClassificationTreeNode, ClassificationEntry } from "../types/classification";
import ClassificationTree from "../components/ClassificationTree";

export default function ClassificationDetail() {
  const { type: typeParam } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [tree, setTree] = useState<ClassificationTreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    getClassificationTypes().then(setTypes).catch(() => {
      setError("Impossible de charger les types de classification.");
    });
  }, []);

  useEffect(() => {
    if (typeParam) {
      setSelectedType(typeParam);
    } else if (types.length > 0) {
      setSelectedType(types[0]);
    }
  }, [typeParam, types]);

  const loadTree = useCallback(async () => {
    if (!selectedType) return;
    try {
      const data = await getClassificationTree(selectedType);
      setTree(data);
      setError(null);
    } catch {
      setError(`Impossible de charger l'arbre pour « ${selectedType} ».`);
    }
  }, [selectedType]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  async function handleUpdate(code: string, data: Partial<ClassificationEntry>) {
    try {
      await updateEntry(selectedType, code, data);
      await loadTree();
    } catch {
      setError("Erreur lors de la mise à jour.");
    }
  }

  async function handleDelete(code: string) {
    if (!confirm(`Supprimer l'entrée « ${code} » ?`)) return;
    try {
      await deleteEntry(selectedType, code);
      await loadTree();
    } catch {
      setError("Erreur lors de la suppression.");
    }
  }

  async function handleExport() {
    setExportError(null);
    try {
      const blob = await exportClassification(selectedType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedType}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Erreur lors de l'export.");
    }
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const t = e.target.value;
    setSelectedType(t);
    navigate(`/classifications/${encodeURIComponent(t)}`);
  }

  return (
    <div>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
        className="fr-mb-3w"
      >
        <div style={{ flex: 1, maxWidth: "400px" }}>
          <Select
            label="Type de classification"
            nativeSelectProps={{
              value: selectedType,
              onChange: handleTypeChange,
            }}
          >
            <option value="" disabled>
              Sélectionnez un type
            </option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <Button
          iconId="fr-icon-download-line"
          priority="secondary"
          disabled={!selectedType}
          onClick={handleExport}
        >
          Exporter JSON
        </Button>
      </div>

      {error && (
        <Alert severity="error" title="Erreur" description={error} className="fr-mb-2w" />
      )}
      {exportError && (
        <Alert severity="error" title="Erreur d'export" description={exportError} className="fr-mb-2w" />
      )}

      {selectedType && (
        <ClassificationTree
          nodes={tree}
          type={selectedType}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
