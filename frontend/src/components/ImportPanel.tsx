import React, { useState, useRef } from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import {
  importClassification,
  previewImport,
  importClassificationCsv,
  importClassificationExcel,
} from '../api/client';
import type { ImportPreview } from '../api/client';
import type { ClassificationFile } from '../types/classification';

const modal = createModal({
  id: 'import-modal',
  isOpenedByDefault: false,
});

type FileFormat = 'json' | 'csv' | 'excel';

function detectFormat(file: File): FileFormat {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx')) return 'excel';
  return 'json';
}

const FORMAT_LABELS: Record<FileFormat, string> = {
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel (.xlsx)',
};

interface ImportPanelProps {
  onImported?: (cf: ClassificationFile) => void;
}

export function ImportPanel({ onImported }: ImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>('json');
  const [csvType, setCsvType] = useState('');        // nom du type pour CSV/Excel
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setStatus('idle');
    setPreview(null);
    setErrorMsg('');

    if (!selected) return;

    const fmt = detectFormat(selected);
    setFormat(fmt);

    if (fmt === 'json') {
      try {
        const p = await previewImport(selected);
        setPreview(p);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMsg(msg ?? 'Fichier illisible');
        setStatus('error');
      }
    }
    // Pour CSV/Excel : pas de preview serveur — on attend la saisie du type
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('idle');
    setErrorMsg('');
    try {
      let cf: ClassificationFile;
      if (format === 'csv') {
        if (!csvType.trim()) { setErrorMsg('Veuillez saisir le nom du type de classification.'); setStatus('error'); return; }
        cf = await importClassificationCsv(file, csvType.trim());
      } else if (format === 'excel') {
        if (!csvType.trim()) { setErrorMsg('Veuillez saisir le nom du type de classification.'); setStatus('error'); return; }
        cf = await importClassificationExcel(file, csvType.trim());
      } else {
        cf = await importClassification(file);
      }
      setStatus('success');
      onImported?.(cf);
    } catch (err: unknown) {
      setStatus('error');
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(msg ?? 'Erreur inconnue');
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setErrorMsg('');
    setCsvType('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <Button iconId="fr-icon-upload-line" onClick={modal.open} priority="secondary">
        Importer une classification
      </Button>

      <modal.Component
        title="Importer un fichier de classification"
        buttons={[
          { doClosesModal: true, children: 'Annuler', onClick: handleReset, priority: 'secondary' },
          {
            doClosesModal: status === 'success',
            children: 'Importer',
            onClick: handleImport,
            disabled: !file || status === 'success',
          },
        ]}
      >
        <div className="fr-upload-group">
          <label className="fr-label" htmlFor="import-file-input">
            Fichier de classification
            <span className="fr-hint-text">
              Formats acceptés : JSON (natif ou brut), CSV, Excel (.xlsx)
            </span>
          </label>
          <input
            ref={inputRef}
            className="fr-upload"
            type="file"
            id="import-file-input"
            accept=".json,.csv,.xlsx"
            onChange={handleFileChange}
          />
        </div>

        {/* Format détecté */}
        {file && (
          <p className="fr-text--sm fr-mt-1w fr-mb-0">
            Format détecté : <strong>{FORMAT_LABELS[format]}</strong>
          </p>
        )}

        {/* Saisie du type pour CSV / Excel (absent dans le fichier, contrairement à JSON) */}
        {file && (format === 'csv' || format === 'excel') && (
          <div className="fr-mt-2w">
            <Input
              label="Nom du type de classification"
              hintText='Ex : "sous-domaine", "domaine", "matière"'
              nativeInputProps={{
                value: csvType,
                onChange: (e) => setCsvType(e.target.value),
                placeholder: 'sous-domaine',
              }}
            />
          </div>
        )}

        {/* Aperçu JSON */}
        {preview && format === 'json' && (
          <div className="fr-mt-2w">
            <p className="fr-text--sm fr-mb-1w">
              <strong>Aperçu :</strong> type « {preview.type} » — {preview.entry_count} entrée(s)
            </p>
            {preview.was_converted && (
              <Alert
                severity="info"
                title="Conversion automatique appliquée"
                description="Le fichier n'était pas au format natif : libellés et hiérarchie ont été normalisés."
                small
                className="fr-mb-1w"
              />
            )}
            {preview.sample.length > 0 && (
              <ul className="fr-text--xs" style={{ color: 'var(--text-mention-grey)' }}>
                {preview.sample.map((e) => (
                  <li key={e.code}>
                    <strong>{e.code}</strong> — {e.nom}
                    {e.parent_code ? ` (parent : ${e.parent_code})` : ' (racine)'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {status === 'success' && (
          <Alert className="fr-mt-2w" severity="success" title="Import réussi"
            description="Le fichier a été chargé en mémoire." small />
        )}
        {status === 'error' && (
          <Alert className="fr-mt-2w" severity="error" title="Erreur lors de l'import"
            description={errorMsg} small />
        )}
      </modal.Component>
    </>
  );
}
