import React, { useState, useRef } from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import {
  importClassification,
  previewImport,
  importClassificationCsv,
  importClassificationExcel,
  getClassificationTypes,
} from '../api/client';
import type { ImportPreview } from '../api/client';
import type { ClassificationFile } from '../types/classification';

const modal = createModal({
  id: 'import-modal',
  isOpenedByDefault: false,
});

let _resetFn: (() => void) | null = null;

/** Ouvre la modale d'import depuis n'importe où (menu, bouton…). */
export function openImportModal(): void {
  _resetFn?.();
  modal.open();
}

/**
 * Événement émis après un import réussi. Les pages intéressées (accueil)
 * peuvent s'y abonner pour rafraîchir leur liste.
 */
export const IMPORT_EVENT = 'si-classification-imported';

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

/**
 * Hôte de la modale d'import. À monter une seule fois (dans App).
 * L'ouverture se fait via `openImportModal()`.
 */
export function ImportModalHost() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>('json');
  const [typeName, setTypeName] = useState('');
  const [typeConflict, setTypeConflict] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doReset = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setErrorMsg('');
    setTypeName('');
    setTypeConflict(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Enregistre la fonction de reset pour que openImportModal() puisse l'appeler
  React.useEffect(() => {
    _resetFn = doReset;
    return () => { _resetFn = null; };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setStatus('idle');
    setPreview(null);
    setErrorMsg('');
    setTypeName('');
    setTypeConflict(false);

    if (!selected) return;

    const fmt = detectFormat(selected);
    setFormat(fmt);

    if (fmt === 'json') {
      try {
        const p = await previewImport(selected);
        setPreview(p);
        const detectedType = p.type ?? '';
        // Vérifie si le type existe déjà en mémoire
        const existingTypes = await getClassificationTypes();
        if (detectedType && existingTypes.includes(detectedType)) {
          setTypeConflict(true);
          // Propose automatiquement un nom unique (suffixe -2, -3, ...)
          let candidate = `${detectedType}-2`;
          let n = 2;
          while (existingTypes.includes(candidate)) { n++; candidate = `${detectedType}-${n}`; }
          setTypeName(candidate);
        } else {
          setTypeName(detectedType);
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMsg(msg ?? 'Le fichier JSON n’a pas pu être lu (format invalide ou serveur inaccessible).');
        setStatus('error');
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('idle');
    setErrorMsg('');

    const finalType = typeName.trim();
    if (!finalType) {
      setErrorMsg('Veuillez saisir le nom du type de classification.');
      setStatus('error');
      return;
    }

    try {
      let cf: ClassificationFile;
      if (format === 'csv') {
        cf = await importClassificationCsv(file, finalType);
      } else if (format === 'excel') {
        cf = await importClassificationExcel(file, finalType);
      } else {
        cf = await importClassification(file, finalType);
      }
      setStatus('success');
      window.dispatchEvent(new CustomEvent(IMPORT_EVENT, { detail: cf }));
    } catch (err: unknown) {
      setStatus('error');
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(msg ?? 'Erreur inconnue');
    }
  };

  return (
    <modal.Component
      title="Importer un fichier de classification"
      buttons={[
        { doClosesModal: true, children: 'Annuler', onClick: doReset, priority: 'secondary' },
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

      {file && (
        <p className="fr-text--sm fr-mt-1w fr-mb-0">
          Format détecté : <strong>{FORMAT_LABELS[format]}</strong>
        </p>
      )}

      {preview && format === 'json' && (
        <div className="fr-mt-2w">
          <p className="fr-text--sm fr-mb-1w">
            {preview.entry_count} entrée(s) détectée(s)
            {preview.version ? ` — version ${preview.version}` : ''}
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

      {typeConflict && (
        <Alert
          className="fr-mt-2w"
          severity="warning"
          title="Type déjà chargé en mémoire"
          description="Un fichier avec ce type existe déjà. Un nouveau nom a été suggéré ci-dessous — modifiez-le ou conservez-le pour créer une copie distincte."
          small
        />
      )}

      {file && (
        <div className="fr-mt-2w">
          <Input
            label="Nom du type de classification"
            hintText='Identifiant unique — deux imports avec le même nom remplaceront le précédent.'
            nativeInputProps={{
              value: typeName,
              onChange: (e) => setTypeName(e.target.value),
              placeholder: 'sous-domaine',
            }}
          />
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
  );
}
