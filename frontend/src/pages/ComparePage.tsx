import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { getClassificationTypes, getClassificationEntries } from '../api/client';
import type { ClassificationEntry } from '../types/classification';

// ── Types ───────────────────────────────────────────────────

type DiffKind = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffRow {
  kind: DiffKind;
  code: string;
  before: ClassificationEntry | null;
  after: ClassificationEntry | null;
}

// ── Logique de comparaison ───────────────────────────────────────

function compareEntries(a: ClassificationEntry[], b: ClassificationEntry[]): DiffRow[] {
  const mapA = new Map(a.map((e) => [e.code, e]));
  const mapB = new Map(b.map((e) => [e.code, e]));
  const allCodes = new Set([...mapA.keys(), ...mapB.keys()]);
  const rows: DiffRow[] = [];

  for (const code of allCodes) {
    const ea = mapA.get(code) ?? null;
    const eb = mapB.get(code) ?? null;
    if (!ea) {
      rows.push({ kind: 'added', code, before: null, after: eb });
    } else if (!eb) {
      rows.push({ kind: 'removed', code, before: ea, after: null });
    } else if (
      ea.nom !== eb.nom ||
      ea.definition !== eb.definition ||
      JSON.stringify(ea.annotations) !== JSON.stringify(eb.annotations) ||
      ea.parent_code !== eb.parent_code
    ) {
      rows.push({ kind: 'modified', code, before: ea, after: eb });
    } else {
      rows.push({ kind: 'unchanged', code, before: ea, after: eb });
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
    diff: rows.map((r) => ({ kind: r.kind, code: r.code, before: r.before, after: r.after })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  download(blob, `comparaison_${labelA}_vs_${labelB}.json`);
}

function exportCsv(rows: DiffRow[], labelA: string, labelB: string) {
  const lines = [
    ['statut', 'code', 'nom_avant', 'nom_apres', 'definition_avant', 'definition_apres', 'annotations_avant', 'annotations_apres'].join(';'),
    ...rows.map((r) => [
      r.kind,
      r.code,
      r.before?.nom ?? '',
      r.after?.nom ?? '',
      r.before?.definition ?? '',
      r.after?.definition ?? '',
      r.before?.annotations.join('|') ?? '',
      r.after?.annotations.join('|') ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')),
  ];
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

const KIND_CONFIG: Record<DiffKind, { label: string; color: string; bg: string }> = {
  added:     { label: 'Ajoutée',    color: '#18753c', bg: '#b8fec9' },
  removed:   { label: 'Supprimée',  color: '#ce0500', bg: '#ffe9e9' },
  modified:  { label: 'Modifiée',   color: '#695240', bg: '#fff3e5' },
  unchanged: { label: 'Inchangée',  color: '#666',    bg: '#f5f5f5' },
};

function DiffLine({ row }: { row: DiffRow }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = KIND_CONFIG[row.kind];
  const hasDetail = row.kind === 'modified';

  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', borderRadius: '4px',
          background: cfg.bg, borderLeft: `4px solid ${cfg.color}`,
          cursor: hasDetail ? 'pointer' : 'default',
        }}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, minWidth: '72px' }}>
          {cfg.label}
        </span>
        <code style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1 }}>{row.code}</code>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>
          {(row.after ?? row.before)?.nom}
        </span>
        {hasDetail && (
          <span style={{ fontSize: '0.75rem', color: '#666' }}>{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      {expanded && row.kind === 'modified' && row.before && row.after && (
        <div style={{ padding: '8px 12px 8px 20px', background: '#fffbf5', borderLeft: '4px solid #ff9947', fontSize: '0.8rem' }}>
          {row.before.nom !== row.after.nom && (
            <FieldDiff label="Nom" before={row.before.nom} after={row.after.nom} />
          )}
          {row.before.definition !== row.after.definition && (
            <FieldDiff label="Définition" before={row.before.definition} after={row.after.definition} />
          )}
          {JSON.stringify(row.before.annotations) !== JSON.stringify(row.after.annotations) && (
            <FieldDiff
              label="Annotations"
              before={row.before.annotations.join(', ') || '—'}
              after={row.after.annotations.join(', ') || '—'}
            />
          )}
          {row.before.parent_code !== row.after.parent_code && (
            <FieldDiff label="Parent" before={row.before.parent_code ?? '—'} after={row.after.parent_code ?? '—'} />
          )}
        </div>
      )}
    </div>
  );
}

function FieldDiff({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <strong>{label} : </strong>
      <span style={{ color: '#ce0500', textDecoration: 'line-through', marginRight: '6px' }}>{before}</span>
      <span style={{ color: '#18753c' }}>{after}</span>
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
          <div
            className="fr-grid-row fr-grid-row--gutters fr-mb-3w"
            style={{ textAlign: 'center' }}
          >
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
                  <div style={{ background: cfg.bg, borderRadius: '8px', padding: '16px', border: `2px solid ${cfg.color}` }}>
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
