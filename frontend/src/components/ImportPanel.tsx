import React, { useState, useRef } from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { importClassification } from '../api/client';
import type { ClassificationFile } from '../types/classification';

const modal = createModal({
  id: 'import-modal',
  isOpenedByDefault: false,
});

interface ImportPanelProps {
  onImported?: (cf: ClassificationFile) => void;
}

export function ImportPanel({ onImported }: ImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ type: string; count: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setStatus('idle');
    setPreview(null);

    if (selected) {
      try {
        const text = await selected.text();
        const data = JSON.parse(text);
        setPreview({ type: data.type ?? '?', count: data.entries?.length ?? 0 });
      } catch {
        setPreview(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      const cf = await importClassification(file);
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
            Fichier JSON de classification
            <span className="fr-hint-text">Format attendu : ClassificationFile (.json)</span>
          </label>
          <input
            ref={inputRef}
            className="fr-upload"
            type="file"
            id="import-file-input"
            accept=".json"
            onChange={handleFileChange}
          />
        </div>

        {preview && (
          <div className="fr-mt-2w">
            <p className="fr-text--sm">
              <strong>Aperçu :</strong> Type « {preview.type} » — {preview.count} entrée(s)
            </p>
          </div>
        )}

        {status === 'success' && (
          <Alert
            className="fr-mt-2w"
            severity="success"
            title="Import réussi"
            description="Le fichier a été chargé en mémoire."
            small
          />
        )}
        {status === 'error' && (
          <Alert
            className="fr-mt-2w"
            severity="error"
            title="Erreur lors de l'import"
            description={errorMsg}
            small
          />
        )}
      </modal.Component>
    </>
  );
}
