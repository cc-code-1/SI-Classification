import React, { useState, useRef } from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { importClassification, previewImport } from '../api/client';
import type { ImportPreview } from '../api/client';
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

    if (selected) {
      try {
        // L'aperçu est calculé côté serveur : il applique la même conversion
        // automatique que l'import réel, ce qui permet de voir le résultat
        // (type détecté, nombre d'entrées, conversion appliquée ou non).
        const p = await previewImport(selected);
        setPreview(p);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMsg(msg ?? "Fichier illisible");
        setStatus('error');
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
            <span className="fr-hint-text">
              Formats acceptés : schéma natif, ou format brut (champ
              « domaine »/« sous_domaine », hiérarchie déduite du code…) —
              la conversion est automatique.
            </span>
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
            <p className="fr-text--sm fr-mb-1w">
              <strong>Aperçu :</strong> type « {preview.type} » — {preview.entry_count} entrée(s)
            </p>
            {preview.was_converted && (
              <Alert
                severity="info"
                title="Conversion automatique appliquée"
                description="Le fichier n'était pas au format natif : les libellés et la hiérarchie ont été normalisés."
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
