import React, { useState } from 'react';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { Input } from '@codegouvfr/react-dsfr/Input';
import type { ClassificationEntry } from '../types/classification';
import { updateEntry, deleteEntry } from '../api/client';

// ── Historique (Phase 6) ────────────────────────────────────────────

interface HistoryEntry {
  date: string;
  before: { nom: string; definition: string; annotations: string[] };
  after:  { nom: string; definition: string; annotations: string[] };
}

const HISTORY_MAX = 30;

function historyKey(type: string, code: string) {
  return `classif_history_${type}_${code}`;
}

function loadHistory(type: string, code: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(type, code));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(type: string, code: string, entry: HistoryEntry) {
  const history = loadHistory(type, code);
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  try { localStorage.setItem(historyKey(type, code), JSON.stringify(history)); } catch {}
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function arrEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ── Composant panneau historique ────────────────────────────────────

function HistoryPanel({ history, onClose }: { history: HistoryEntry[]; onClose: () => void }) {
  if (history.length === 0) {
    return (
      <div className="fr-p-2w" style={{ background: 'var(--grey-975)', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong className="fr-text--sm">Historique des modifications</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        <p className="fr-text--sm fr-text--mention">Aucune modification enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="fr-p-2w" style={{ background: 'var(--grey-975)', borderRadius: '4px', maxHeight: '400px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong className="fr-text--sm">Historique ({history.length} modification{history.length > 1 ? 's' : ''})</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
      </div>
      {history.map((h, i) => (
        <div key={i} className="fr-mb-2w" style={{ borderLeft: '3px solid var(--border-default-grey)', paddingLeft: '12px' }}>
          <p className="fr-text--xs fr-mb-1w" style={{ color: 'var(--text-mention-grey)', fontWeight: 600 }}>
            {formatDate(h.date)}
          </p>
          {h.before.nom !== h.after.nom && (
            <DiffRow label="Nom" before={h.before.nom} after={h.after.nom} />
          )}
          {h.before.definition !== h.after.definition && (
            <DiffRow label="Définition" before={h.before.definition} after={h.after.definition} />
          )}
          {!arrEqual(h.before.annotations, h.after.annotations) && (
            <DiffRow
              label="Annotations"
              before={h.before.annotations.join(', ') || '—'}
              after={h.after.annotations.join(', ') || '—'}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DiffRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="fr-mb-1w">
      <p className="fr-text--xs fr-mb-0w" style={{ fontWeight: 600, color: 'var(--text-label-grey)' }}>{label}</p>
      <p className="fr-text--xs fr-mb-0w" style={{ color: 'var(--error-425)', textDecoration: 'line-through' }}>
        {before}
      </p>
      <p className="fr-text--xs" style={{ color: 'var(--success-425)' }}>
        {after}
      </p>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────

interface ClassificationCardProps {
  entry: ClassificationEntry;
  type: string;
  ancestors?: { code: string; nom: string }[];
  onUpdated?: (updated: ClassificationEntry) => void;
  onDeleted?: (code: string) => void;
}

export function ClassificationCard({ entry, type, ancestors, onUpdated, onDeleted }: ClassificationCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({
    nom: entry.nom,
    definition: entry.definition,
    annotations: [...entry.annotations],
  });
  const [newAnnotation, setNewAnnotation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const history = loadHistory(type, entry.code);

  const handleAddAnnotation = () => {
    const trimmed = newAnnotation.trim();
    if (!trimmed || form.annotations.includes(trimmed)) return;
    setForm({ ...form, annotations: [...form.annotations, trimmed] });
    setNewAnnotation('');
  };

  const handleRemoveAnnotation = (ann: string) => {
    setForm({ ...form, annotations: form.annotations.filter((a) => a !== ann) });
  };

  const handleDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteEntry(type, entry.code);
      onDeleted?.(entry.code);
    } catch {
      setError('Erreur lors de la suppression.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const before = { nom: entry.nom, definition: entry.definition, annotations: [...entry.annotations] };
      const updated = await updateEntry(type, entry.code, {
        nom: form.nom,
        definition: form.definition,
        annotations: form.annotations,
      });
      const after = { nom: updated.nom, definition: updated.definition, annotations: [...updated.annotations] };
      if (before.nom !== after.nom || before.definition !== after.definition || !arrEqual(before.annotations, after.annotations)) {
        saveHistory(type, entry.code, { date: new Date().toISOString(), before, after });
      }
      setEditing(false);
      setShowHistory(false);
      onUpdated?.(updated);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ nom: entry.nom, definition: entry.definition, annotations: [...entry.annotations] });
    setNewAnnotation('');
    setEditing(false);
    setError('');
  };

  return (
    <div className="fr-card fr-card--no-arrow fr-p-3w" style={{ height: '100%' }}>
      <div className="fr-card__body">
        <div className="fr-card__content">
          {/* Fil d'Ariane */}
          {ancestors && ancestors.length > 0 && (
            <p className="fr-text--xs fr-mb-1w" style={{ color: 'var(--text-mention-grey)' }}>
              {ancestors.map((a) => (
                <span key={a.code}>
                  <code style={{ fontSize: '0.7rem' }} title={a.nom}>{a.code}</code>
                  {' › '}
                </span>
              ))}
              <span style={{ fontStyle: 'italic' }}>(courant)</span>
            </p>
          )}

          {/* En-tête : code + boutons */}
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w" style={{ justifyContent: 'space-between' }}>
            <Badge severity="info" noIcon>{entry.code}</Badge>
            {!editing && (
              <div className="fr-btns-group fr-btns-group--inline">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  title={`Historique${history.length > 0 ? ` (${history.length})` : ''}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-mention-grey)', position: 'relative' }}
                >
                  <span className="fr-icon-time-line" aria-hidden="true" style={{ fontSize: '1.1rem' }} />
                  {history.length > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--blue-france-sun-113)', color: 'white', borderRadius: '50%', fontSize: '0.6rem', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {history.length > 9 ? '9+' : history.length}
                    </span>
                  )}
                </button>
                <Button
                  iconId="fr-icon-edit-line"
                  onClick={() => { setShowHistory(false); setEditing(true); }}
                  priority="tertiary no outline"
                  size="small"
                  title="Modifier"
                />
                <Button
                  iconId="fr-icon-delete-line"
                  onClick={() => setConfirmDelete(true)}
                  priority="tertiary no outline"
                  size="small"
                  title="Supprimer"
                />
              </div>
            )}
          </div>

          {/* Panneau historique */}
          {showHistory && !editing && (
            <div className="fr-mb-2w">
              <HistoryPanel history={history} onClose={() => setShowHistory(false)} />
            </div>
          )}

          {/* Confirmation suppression */}
          {confirmDelete && (
            <div className="fr-p-2w fr-mb-2w" style={{ background: 'var(--error-950-100)', borderRadius: '4px' }}>
              <p className="fr-text--sm fr-mb-1w">
                Supprimer l'entrée <strong>{entry.code}</strong> ? Ses éventuels enfants deviendront des racines.
              </p>
              {error && <p className="fr-error-text fr-mb-1w">{error}</p>}
              <div className="fr-btns-group fr-btns-group--inline">
                <Button size="small" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Suppression…' : 'Confirmer'}
                </Button>
                <Button size="small" priority="secondary" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Mode édition */}
          {editing ? (
            <div>
              <Input
                label="Nom"
                nativeInputProps={{
                  value: form.nom,
                  onChange: (e) => setForm({ ...form, nom: e.target.value }),
                }}
              />
              <Input
                label="Définition"
                textArea
                nativeTextAreaProps={{
                  value: form.definition,
                  rows: 4,
                  onChange: (e) => setForm({ ...form, definition: e.target.value }),
                }}
              />

              {/* Annotations en mode chip */}
              <div className="fr-mb-2w">
                <label className="fr-label fr-mb-1w">Annotations</label>
                {form.annotations.length > 0 && (
                  <ul className="fr-tags-group fr-mb-1w">
                    {form.annotations.map((ann) => (
                      <li key={ann} style={{ listStyle: 'none' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--grey-925)', borderRadius: '12px', padding: '3px 10px', fontSize: '0.8rem' }}>
                          {ann}
                          <button
                            onClick={() => handleRemoveAnnotation(ann)}
                            title={`Supprimer « ${ann} »`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-mention-grey)', lineHeight: 1, fontSize: '0.9rem' }}
                          >✕</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="fr-input"
                    placeholder="Nouvelle annotation…"
                    value={newAnnotation}
                    onChange={(e) => setNewAnnotation(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAnnotation(); } }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    priority="secondary"
                    iconId="fr-icon-add-line"
                    onClick={handleAddAnnotation}
                    disabled={!newAnnotation.trim()}
                    title="Ajouter"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>

              {error && <p className="fr-error-text fr-mb-1w">{error}</p>}
              <div className="fr-btns-group fr-btns-group--inline fr-mt-2w">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </Button>
                <Button onClick={handleCancel} priority="secondary">
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            /* Mode lecture */
            <div>
              <h4 className="fr-card__title fr-mb-1w">{entry.nom}</h4>
              {entry.parent_code && (
                <p className="fr-text--sm fr-text--mention fr-mb-1w">
                  Parent : <code>{entry.parent_code}</code>
                </p>
              )}
              <p className="fr-text--sm fr-mb-2w">{entry.definition}</p>
              {entry.annotations.length > 0 && (
                <div>
                  <p className="fr-text--xs fr-mb-1w" style={{ fontWeight: 600 }}>Annotations :</p>
                  <ul className="fr-tags-group">
                    {entry.annotations.map((ann) => (
                      <li key={ann}><Tag>{ann}</Tag></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
