import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { getClassificationTypes, getClassificationEntries } from '../api/client';
import type { ClassificationEntry } from '../types/classification';

// ── Types ───────────────────────────────────────────────────

type DiffKind = 'added' | 'removed' | 'modified' | 'unchanged';

interface FieldChange {
  field: string;
  before: string;
  after: string;
}

interface DiffRow {
  kind: DiffKind;
  code: string;
  before: ClassificationEntry | null;
  after: ClassificationEntry | null;
  changes: FieldChange[];
}

// ── Logique de comparaison ───────────────────────────────────────

function entryChanges(a: ClassificationEntry, b: ClassificationEntry): FieldChange[] {
  const changes: FieldChange[] = [];
  if (a.nom !== b.nom)
    changes.push({ field: 'Nom', before: a.nom, after: b.nom });
  if (a.definition !== b.definition)
    changes.push({ field: 'Définition', before: a.definition || '—', after: b.definition || '—' });
  if (JSON.stringify(a.annotations) !== JSON.stringify(b.annotations))
    changes.push({
      field: 'Annotations',
      before: a.annotations.join(' ; ') || '—',
      after: b.annotations.join(' ; ') || '—',
    });
  if ((a.parent_code ?? '') !== (b.parent_code ?? ''))
    changes.push({ field: 'Parent', before: a.parent_code ?? '—', after: b.parent_code ?? '—' });
  return changes;
}

function compareEntries(a: ClassificationEntry[], b: ClassificationEntry[]): DiffRow[] {
  const mapA = new Map(a.map((e) => [e.code, e]));
  const mapB = new Map(b.map((e) => [e.code, e]));
  const allCodes = new Set([...mapA.keys(), ...mapB.keys()]);
  const rows: DiffRow[] = [];

  for (const code of allCodes) {
    const ea = mapA.get(code) ?? null;
    const eb = mapB.get(code) ?? null;
    if (!ea) {
      rows.push({ kind: 'added', code, before: null, after: eb, changes: [] });
    } else if (!eb) {
      rows.push({ kind: 'removed', code, before: ea, after: null, changes: [] });
    } else {
      const changes = entryChanges(ea, eb);
      rows.push({
        kind: changes.length > 0 ? 'modified' : 'unchanged',
        code,
        before: ea,
        after: eb,
        changes,
      });
    }
  }

  const order: Record<DiffKind, number> = { added: 0, removed: 1, modified: 2, unchanged: 3 };
  rows.sort((x, y) => order[x.kind] - order[y.kind] || x.code.localeCompare(y.code));
  return rows;
}

// ── Export rapport ─────────────────────────────────────────────

function exportJson(rows: DiffRow[], labelA: string, labelB: string) {
  const data = {
    comparison: { source: labelA, target: labelB, date: new Date().toISOString() },
    summary: {
      added: rows.filter((r) => r.kind === 'added').length,
      removed: rows.filter((r) => r.kind === 'removed').length,
      modified: rows.filter((r) => r.kind === 'modified').length,
      unchanged: rows.filter((r) => r.kind === 'unchanged').length,
    },
    diff: rows.map((r) => ({ kind: r.kind, code: r.code, changes: r.changes, before: r.before, after: r.after })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  download(blob, `comparaison_${labelA}_vs_${labelB}.json`);
}

function exportCsv(rows: DiffRow[], labelA: string, labelB: string) {
  const lines = [
    ['statut', 'code', 'champ', 'avant', 'apres'].join(';'),
  ];
  for (const r of rows) {
    if (r.kind === 'modified' && r.changes.length > 0) {
      for (const c of r.changes) {
        lines.push(
          [r.kind, r.code, c.field, c.before, c.after]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')
        );
      }
    } else {
      const entry = r.after ?? r.before;
      lines.push(
        [r.kind, r.code, '', entry?.nom ?? '', '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')
      );
    }
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  download(blob, `comparaison_${labelA}_vs_${labelB}.csv`);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Composant sélecteur de source ────────────────────────────────────

interface SourceSelectorProps {
  label: string;
  types: string[];
  onEntriesLoaded: (entries: ClassificationEntry[], label: string) => void;
}

function SourceSelector({ label, types, onEntriesLoaded }: SourceSelectorProps) {
  const [mode, setMode] = useState<'loaded' | 'file'>('loaded');
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFromType = async (type: string) => {
    if (!type) return;
    setLoading(true); setError('');
    try {
      const entries = await getClassificationEntries(type);
      onEntriesLoaded(entries, type);
    } catch {
      setError('Impossible de charger cette classification.');
    } finally {
      setLoading(false);
    }
  };

  const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const entries: ClassificationEntry[] = Array.isArray(data.entries)
          ? flattenEntries(data.entries)
          : [];
        onEntriesLoaded(entries, file.name.replace(/\.json$/i, ''));
      } catch {
        setError('Fichier JSON invalide.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ border: '1px solid var(--border-default-grey)', borderRadius: '8px', padding: '16px' }}>
      <p className="fr-text--sm" style={{ fontWeight: 700, marginBottom: '12px' }}>{label}</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          className={`fr-btn fr-btn--sm ${mode === 'loaded' ? '' : 'fr-btn--secondary'}`}
          onClick={() => setMode('loaded')}
        >
          Classification chargée
        </button>
        <button
          className={`fr-btn fr-btn--sm ${mode === 'file' ? '' : 'fr-btn--secondary'}`}
          onClick={() => setMode('file')}
        >
          Fichier JSON
        </button>
      </div>

      {mode === 'loaded' ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="fr-select"
            value={selected}
            onChange={(e) => { setSelected(e.target.value); loadFromType(e.target.value); }}
            style={{ flex: 1 }}
          >
            <option value="">— Choisir une classification —</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {loading && <span className="fr-text--sm fr-text--mention">Chargement…</span>}
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={loadFromFile} />
          <Button size="small" priority="secondary" iconId="fr-icon-upload-line" onClick={() => fileRef.current?.click()}>
            Choisir un fichier
          </Button>
        </>
      )}
      {error && <p className="fr-error-text fr-mt-1w">{error}</p>}
    </div>
  );
}

function flattenEntries(entries: ClassificationEntry[]): ClassificationEntry[] {
  const result: ClassificationEntry[] = [];
  const recurse = (list: ClassificationEntry[]) => {
    for (const e of list) {
      const { children, ...rest } = e as ClassificationEntry & { children?: ClassificationEntry[] };
      result.push(rest as ClassificationEntry);
      if (children?.length) recurse(children);
    }
  };
  recurse(entries);
  return result;
}

// ── Ligne de diff ──────────────────────────────────────────────────

const KIND_CONFIG: Record<DiffKind, { label: string; color: string; bg: string; border: string }> = {
  added:     { label: 'Ajoutée',    color: '#18753c', bg: '#eefff3', border: '#18753c' },
  removed:   { label: 'Supprimée',  color: '#ce0500', bg: '#fff5f5', border: '#ce0500' },
  modified:  { label: 'Modifiée',   color: '#695240', bg: '#fffbf5', border: '#ff9947' },
  unchanged: { label: 'Inchangée',  color: '#666',    bg: '#f8f8f8', border: '#ccc' },
};

function DiffLine({ row }: { row: DiffRow }) {
  const cfg = KIND_CONFIG[row.kind];
  const entry = row.after ?? row.before;

  return (
    <div style={{
      marginBottom: '6px',
      borderRadius: '4px',
      border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.border}`,
      background: cfg.bg,
      overflow: 'hidden',
    }}>
      {/* En-tête de l'entrée */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, color: cfg.color,
          minWidth: '72px', textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
          {cfg.label}
        </span>
        <code style={{ fontSize: '0.8rem', fontWeight: 700, flex: '0 0 auto', marginRight: '4px' }}>
          {row.code}
        </code>
        <span style={{ fontSize: '0.85rem', color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry?.nom}
        </span>
        {row.kind === 'modified' && (
          <span style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {row.changes.length} champ{row.changes.length > 1 ? 's' : ''} modifié{row.changes.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Détail champ par champ pour les entrées modifiées */}
      {row.kind === 'modified' && row.changes.length > 0 && (
        <div style={{ borderTop: `1px solid ${cfg.border}20`, padding: '8px 12px 8px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ color: '#888', fontSize: '0.72rem' }}>
                <th style={{ textAlign: 'left', width: '90px', paddingBottom: '4px', fontWeight: 600 }}>Champ</th>
                <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 600 }}>Avant</th>
                <th style={{ textAlign: 'left', width: '20px', paddingBottom: '4px' }}></th>
                <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 600 }}>Après</th>
              </tr>
            </thead>
            <tbody>
              {row.changes.map((c) => (
                <tr key={c.field} style={{ verticalAlign: 'top' }}>
                  <td style={{ paddingRight: '8px', paddingTop: '3px', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {c.field}
                  </td>
                  <td style={{
                    paddingRight: '8px', paddingTop: '3px',
                    color: '#ce0500', background: '#fff0f0',
                    borderRadius: '3px', padding: '2px 6px',
                    maxWidth: '260px', wordBreak: 'break-word',
                  }}>
                    <span style={{ textDecoration: 'line-through' }}>{c.before}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '3px 4px', color: '#888', fontSize: '0.9rem' }}>→</td>
                  <td style={{
                    paddingTop: '3px',
                    color: '#18753c', background: '#f0fff4',
                    borderRadius: '3px', padding: '2px 6px',
                    maxWidth: '260px', wordBreak: 'break-word',
                  }}>
                    {c.after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Champs pour les ajoutées / supprimées */}
      {(row.kind === 'added' || row.kind === 'removed') && entry && (
        <div style={{ borderTop: `1px solid ${cfg.border}20`, padding: '6px 12px 6px 20px', fontSize: '0.78rem', color: '#555' }}>
          {entry.definition && (
            <div><strong>Déf. :</strong> {entry.definition}</div>
          )}
          {entry.annotations.length > 0 && (
            <div><strong>Annotations :</strong> {entry.annotations.join(' ; ')}</div>
          )}
          {entry.parent_code && (
            <div><strong>Parent :</strong> {entry.parent_code}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────

export function ComparePage() {
  const [types, setTypes] = useState<string[]>([]);
  const [sourceA, setSourceA] = useState<{ entries: ClassificationEntry[]; label: string } | null>(null);
  const [sourceB, setSourceB] = useState<{ entries: ClassificationEntry[]; label: string } | null>(null);
  const [diff, setDiff] = useState<DiffRow[] | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  useEffect(() => {
    getClassificationTypes().then(setTypes).catch(() => {});
  }, []);

  const handleCompare = () => {
    if (!sourceA || !sourceB) return;
    setDiff(compareEntries(sourceA.entries, sourceB.entries));
  };

  const rows = diff
    ? (showUnchanged ? diff : diff.filter((r) => r.kind !== 'unchanged'))
    : null;

  const summary = diff
    ? {
        added:     diff.filter((r) => r.kind === 'added').length,
        removed:   diff.filter((r) => r.kind === 'removed').length,
        modified:  diff.filter((r) => r.kind === 'modified').length,
        unchanged: diff.filter((r) => r.kind === 'unchanged').length,
      }
    : null;

  return (
    <div className="fr-container fr-py-4w">
      <h1 className="fr-h3 fr-mb-4w">Comparaison de classifications</h1>

      {/* Sélecteurs */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
        <div className="fr-col-12 fr-col-md-5">
          <SourceSelector
            label="Classification A (référence)"
            types={types}
            onEntriesLoaded={(entries, label) => { setSourceA({ entries, label }); setDiff(null); }}
          />
          {sourceA && (
            <p className="fr-text--xs fr-mt-1w" style={{ color: 'var(--text-mention-grey)' }}>
              ✓ {sourceA.label} — {sourceA.entries.length} entrée(s)
            </p>
          )}
        </div>

        <div className="fr-col-12 fr-col-md-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.5rem', color: 'var(--text-mention-grey)' }}>⇄</span>
        </div>

        <div className="fr-col-12 fr-col-md-5">
          <SourceSelector
            label="Classification B (comparée)"
            types={types}
            onEntriesLoaded={(entries, label) => { setSourceB({ entries, label }); setDiff(null); }}
          />
          {sourceB && (
            <p className="fr-text--xs fr-mt-1w" style={{ color: 'var(--text-mention-grey)' }}>
              ✓ {sourceB.label} — {sourceB.entries.length} entrée(s)
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <Button
          iconId="fr-icon-search-line"
          onClick={handleCompare}
          disabled={!sourceA || !sourceB}
        >
          Comparer
        </Button>
      </div>

      {/* Résultats */}
      {summary && rows && (
        <>
          {/* Résumé */}
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w" style={{ textAlign: 'center' }}>
            {(
              [
                { kind: 'added',     count: summary.added },
                { kind: 'removed',   count: summary.removed },
                { kind: 'modified',  count: summary.modified },
                { kind: 'unchanged', count: summary.unchanged },
              ] as { kind: DiffKind; count: number }[]
            ).map(({ kind, count }) => {
              const cfg = KIND_CONFIG[kind];
              return (
                <div key={kind} className="fr-col-6 fr-col-md-3">
                  <div style={{ background: cfg.bg, borderRadius: '8px', padding: '16px', border: `2px solid ${cfg.border}` }}>
                    <p style={{ fontSize: '2rem', fontWeight: 900, color: cfg.color, margin: 0 }}>{count}</p>
                    <p style={{ fontSize: '0.8rem', color: cfg.color, margin: 0, fontWeight: 600 }}>{cfg.label}{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contrôles */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              priority="tertiary"
              onClick={() => setShowUnchanged(!showUnchanged)}
            >
              {showUnchanged ? 'Masquer les inchangées' : `Afficher les inchangées (${summary.unchanged})`}
            </Button>
            <Button
              size="small"
              priority="secondary"
              iconId="fr-icon-download-line"
              onClick={() => exportJson(diff!, sourceA!.label, sourceB!.label)}
            >
              Export JSON
            </Button>
            <Button
              size="small"
              priority="secondary"
              iconId="fr-icon-download-line"
              onClick={() => exportCsv(diff!, sourceA!.label, sourceB!.label)}
            >
              Export CSV
            </Button>
          </div>

          {/* Diff */}
          <div>
            {rows.length === 0 ? (
              <p className="fr-text--sm fr-text--mention">Aucune différence trouvée.</p>
            ) : (
              rows.map((row) => <DiffLine key={row.code} row={row} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
