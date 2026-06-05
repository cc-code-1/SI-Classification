import React from 'react'; // eslint-disable-line
import { Button } from '@codegouvfr/react-dsfr/Button';
import { exportClassification } from '../api/client';

interface ExportPanelProps {
  type: string;
}

export function ExportPanel({ type }: ExportPanelProps) {
  const handleExport = async () => {
    try {
      const blob = await exportClassification(type);
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${type}_${date}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de l'export.");
    }
  };

  return (
    <Button iconId="fr-icon-download-line" onClick={handleExport} priority="secondary">
      Exporter le JSON
    </Button>
  );
}
