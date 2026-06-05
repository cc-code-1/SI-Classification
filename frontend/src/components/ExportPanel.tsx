import React from 'react'; // eslint-disable-line
import { Button } from '@codegouvfr/react-dsfr/Button';
import {
  exportClassification,
  exportClassificationCsv,
  exportClassificationExcel,
} from '../api/client';

interface ExportPanelProps {
  type: string;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPanel({ type }: ExportPanelProps) {
  const date = new Date().toISOString().slice(0, 10);

  const handleJson = async (format: 'nested' | 'flat') => {
    try {
      const blob = await exportClassification(type, format);
      const suffix = format === 'flat' ? `_plat_${date}` : `_${date}`;
      download(blob, `${type}${suffix}.json`);
    } catch {
      alert("Erreur lors de l'export JSON.");
    }
  };

  const handleCsv = async () => {
    try {
      const blob = await exportClassificationCsv(type);
      download(blob, `${type}_${date}.csv`);
    } catch {
      alert("Erreur lors de l'export CSV.");
    }
  };

  const handleExcel = async () => {
    try {
      const blob = await exportClassificationExcel(type);
      download(blob, `${type}_${date}.xlsx`);
    } catch {
      alert("Erreur lors de l'export Excel.");
    }
  };

  return (
    <div className="fr-btns-group fr-btns-group--inline">
      <Button iconId="fr-icon-download-line" onClick={() => handleJson('nested')} priority="secondary" size="small">
        JSON imbriqué
      </Button>
      <Button iconId="fr-icon-download-line" onClick={() => handleJson('flat')} priority="secondary" size="small">
        JSON plat
      </Button>
      <Button iconId="fr-icon-download-line" onClick={handleCsv} priority="secondary" size="small">
        CSV
      </Button>
      <Button iconId="fr-icon-download-line" onClick={handleExcel} priority="secondary" size="small">
        Excel
      </Button>
    </div>
  );
}
