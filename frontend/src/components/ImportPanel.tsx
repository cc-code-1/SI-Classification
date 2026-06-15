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
  setFamilyIdInStorage,
} from '../api/client';
import type { ImportPreview } from '../api/client';
import type { ClassificationFile } from '../types/classification';
import { detectFamilyFromCodes } from '../constants/families';

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

/** Type de repli = nom du fichier sans extension. */
function fallbackTypeOf(file: File): string {
  return file.name.replace(/\.[^.]+$/, '');
}

/** Résout un nom de type unique en suffixant -2, -3, … si nécessaire. */
function uniqueType(desired: string, existing: Set<string>): string {
  if (!existing.has(desired)) return desired;
  let n = 2;
  let candidate = `${desired}-${n}`;
  while (existing.has(candidate)) { n++; candidate = `${desired}-${n}`; }
  return candidate;
}

interface BatchResult {
  name: string;
  type: string;
  ok: boolean;
  error?: string;
}

/**
 * Hôte de la modale d'import. À monter une seule fois (dans App).
 * L'ouverture se fait via `openImportModal()`.
 */
export function ImportModalHost() {
  // --- Mode mono-fichier (saisie fine du type) ---
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>('json');
  const [typeName, setTypeName] = useState('');
  const [typeConflict, setTypeConflict] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // --- Mode multi-fichiers ---
  const [files, setFiles] = useState<File[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const multi = files.length > 1;

  const doReset = () => {
    setFile(null);
    setFiles([]);
    setPreview(null);
    setStatus('idle');
    setErrorMsg('');
    setTypeName('');
    setTypeConflict(false);
    setBatchRunning(false);
    setBatchResults(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Enregistre la fonction de reset pour que openImportModal() puisse l'appeler
  React.useEffect(() => {
    _resetFn = doReset;
    return () => { _resetFn = null; };
  }, []);

  const [dragging, setDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files ? Array.from(e.target.files) : []);
  };

  const processFiles = async (selectedList: File[]) => {
    setStatus('idle');
    setPreview(null);
    setErrorMsg('');
    setTypeName('');
    setTypeConflict(false);
    setBatchResults(null);
    setFiles(selectedList);

    if (selectedList.length === 0) {
      setFile(null);
      return;
    }

    // Plusieurs fichiers : pas d'aperçu individuel, l'import se fait en lot.
    if (selectedList.length > 1) {
      setFile(null);
      return;
    }

    const selected = selectedList[0];
    setFile(selected);

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
          setTypeName(uniqueType(detectedType, new Set(existingTypes)));
        } else {
          setTypeName(detectedType);
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMsg(msg ?? 'Le fichier JSON n’a pas pu être lu (format invalide ou serveur inaccessible).');
        setStatus('error');
      }
    } else {
      // CSV / Excel : pas d'aperçu serveur, on dérive le type du nom de fichier.
      const base = fallbackTypeOf(selected);
      try {
        const existingTypes = await getClassificationTypes();
        if (existingTypes.includes(base)) {
          setTypeConflict(true);
          setTypeName(uniqueType(base, new Set(existingTypes)));
        } else {
          setTypeName(base);
        }
      } catch {
        setTypeName(base);
      }
    }
  };

  const importOne = async (f: File, type: string): Promise<ClassificationFile> => {
    const fmt = detectFormat(f);
    if (fmt === 'csv') return importClassificationCsv(f, type);
    if (fmt === 'excel') return importClassificationExcel(f, type);
    return importClassification(f, type);
  };

  /** Détecte la famille depuis les codes du fichier importé et la persiste
   *  uniquement si aucune famille n'est déjà assignée manuellement. */
  const autoAssignFamily = (cf: ClassificationFile) => {
    const existing = localStorage.getItem(`family_${cf.type}`);
    if (existing) return; // une attribution manuelle est prioritaire
    const codes = cf.entries.map((e) => e.code);
    const familyId = detectFamilyFromCodes(codes);
    if (familyId !== null) setFamilyIdInStorage(cf.type, familyId);
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
      const cf = await importOne(file, finalType);
      autoAssignFamily(cf);
      setStatus('success');
      window.dispatchEvent(new CustomEvent(IMPORT_EVENT, { detail: cf }));
    } catch (err: unknown) {
      setStatus('error');
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(msg ?? 'Erreur inconnue');
    }
  };

  const handleBatchImport = async () => {
    if (files.length === 0) return;
    setBatchRunning(true);
    setBatchResults(null);

    // Suit les types déjà pris (mémoire + ceux importés dans ce lot) pour
    // éviter qu'un fichier n'écrase le précédent.
    let taken: Set<string>;
    try {
      taken = new Set(await getClassificationTypes());
    } catch {
      taken = new Set();
    }

    const results: BatchResult[] = [];
    for (const f of files) {
      const fmt = detectFormat(f);
      // Pour le JSON on tente de récupérer le type déclaré, sinon nom du fichier.
      let base = fallbackTypeOf(f);
      if (fmt === 'json') {
        try {
          const p = await previewImport(f);
          if (p.type) base = p.type;
        } catch { /* on garde le nom de fichier comme repli */ }
      }
      const type = uniqueType(base, taken);
      try {
        const cf = await importOne(f, type);
        taken.add(type);
        autoAssignFamily(cf);
        results.push({ name: f.name, type, ok: true });
        window.dispatchEvent(new CustomEvent(IMPORT_EVENT, { detail: cf }));
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        results.push({ name: f.name, type, ok: false, error: msg ?? 'Erreur inconnue' });
      }
    }

    setBatchResults(results);
    setBatchRunning(false);
  };

  const batchDone = batchResults !== null;
  const okCount = batchResults?.filter((r) => r.ok).length ?? 0;

  return (
    <modal.Component
      title="Importer un fichier de classification"
      buttons={[
        { doClosesModal: true, children: 'Annuler', onClick: doReset, priority: 'secondary' },
        multi
          ? {
              doClosesModal: batchDone,
              children: batchRunning ? 'Import en cours…' : 'Tout importer',
              onClick: handleBatchImport,
              disabled: batchRunning || batchDone,
            }
          : {
              doClosesModal: status === 'success',
              children: 'Importer',
              onClick: handleImport,
              disabled: !file || status === 'success',
            },
      ]}
    >
      <div className="fr-upload-group">
        <label className="fr-label" htmlFor="import-file-input">
          Fichier(s) de classification
          <span className="fr-hint-text">
            Formats acceptés : JSON (natif ou brut), CSV, Excel (.xlsx). Vous
            pouvez sélectionner plusieurs fichiers à la fois.
          </span>
        </label>
        <input
          ref={inputRef}
          className="fr-upload"
          type="file"
          id="import-file-input"
          accept=".json,.csv,.xlsx"
          multiple
          onChange={handleFileChange}
        />

        {/* Zone de dépôt par glisser-déposer */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
            if (dropped.length > 0) processFiles(dropped);
          }}
          onClick={() => inputRef.current?.click()}
          className="fr-mt-2w"
          style={{
            border: `2px dashed ${dragging ? 'var(--border-active-blue-france)' : 'var(--border-default-grey)'}`,
            borderRadius: '8px',
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--background-open-blue-france)' : 'var(--background-alt-grey)',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <span className="fr-icon-upload-line" aria-hidden="true" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }} />
          <span className="fr-text--sm" style={{ color: 'var(--text-mention-grey)' }}>
            Glissez-déposez vos fichiers ici, ou cliquez pour parcourir
          </span>
        </div>
      </div>

      {/* ---------- Mode multi-fichiers ---------- */}
      {multi && (
        <div className="fr-mt-2w">
          <p className="fr-text--sm fr-mb-1w">
            <strong>{files.length} fichiers</strong> sélectionnés. Chaque fichier
            sera importé avec son type détecté (ou son nom de fichier). Les noms en
            conflit seront automatiquement suffixés (-2, -3, …).
          </p>
          <ul className="fr-text--xs" style={{ color: 'var(--text-mention-grey)' }}>
            {files.map((f) => {
              const res = batchResults?.find((r) => r.name === f.name);
              return (
                <li key={f.name}>
                  <strong>{f.name}</strong> — {FORMAT_LABELS[detectFormat(f)]}
                  {res && (res.ok
                    ? <span style={{ color: 'var(--success-425)' }}> ✓ importé sous « {res.type} »</span>
                    : <span style={{ color: 'var(--error-425)' }}> ✗ {res.error}</span>)}
                </li>
              );
            })}
          </ul>
          {batchDone && (
            <Alert
              className="fr-mt-2w"
              severity={okCount === files.length ? 'success' : (okCount === 0 ? 'error' : 'warning')}
              title={`${okCount}/${files.length} fichier(s) importé(s)`}
              description={okCount === files.length
                ? 'Tous les fichiers ont été chargés en mémoire.'
                : 'Certains fichiers n’ont pas pu être importés (voir le détail ci-dessus).'}
              small
            />
          )}
        </div>
      )}

      {/* ---------- Mode mono-fichier ---------- */}
      {!multi && file && (
        <p className="fr-text--sm fr-mt-1w fr-mb-0">
          Format détecté : <strong>{FORMAT_LABELS[format]}</strong>
        </p>
      )}

      {!multi && preview && format === 'json' && (
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

      {!multi && typeConflict && (
        <Alert
          className="fr-mt-2w"
          severity="warning"
          title="Type déjà chargé en mémoire"
          description="Un fichier avec ce type existe déjà. Un nouveau nom a été suggéré ci-dessous — modifiez-le ou conservez-le pour créer une copie distincte."
          small
        />
      )}

      {!multi && file && (
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

      {!multi && status === 'success' && (
        <Alert className="fr-mt-2w" severity="success" title="Import réussi"
          description="Le fichier a été chargé en mémoire." small />
      )}
      {!multi && status === 'error' && (
        <Alert className="fr-mt-2w" severity="error" title="Erreur lors de l'import"
          description={errorMsg} small />
      )}
    </modal.Component>
  );
}
