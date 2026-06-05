import React, { useState } from 'react';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { Input } from '@codegouvfr/react-dsfr/Input';
import type { ClassificationEntry } from '../types/classification';
import { updateEntry, deleteEntry } from '../api/client';

interface ClassificationCardProps {
  entry: ClassificationEntry;
  type: string;
  onUpdated?: (updated: ClassificationEntry) => void;
  onDeleted?: (code: string) => void;
}

export function ClassificationCard({ entry, type, onUpdated, onDeleted }: ClassificationCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    nom: entry.nom,
    definition: entry.definition,
    annotations: entry.annotations.join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const updated = await updateEntry(type, entry.code, {
        nom: form.nom,
        definition: form.definition,
        annotations: form.annotations.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setEditing(false);
      onUpdated?.(updated);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      nom: entry.nom,
      definition: entry.definition,
      annotations: entry.annotations.join(', '),
    });
    setEditing(false);
    setError('');
  };

  return (
    <div className="fr-card fr-card--no-arrow fr-p-3w" style={{ height: '100%' }}>
      <div className="fr-card__body">
        <div className="fr-card__content">
          {/* En-tête : code + bouton édition */}
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w" style={{ justifyContent: 'space-between' }}>
            <Badge severity="info" noIcon>{entry.code}</Badge>
            {!editing ? (
              <div className="fr-btns-group fr-btns-group--inline">
                <Button
                  iconId="fr-icon-edit-line"
                  onClick={() => setEditing(true)}
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
            ) : null}
          </div>

          {confirmDelete && (
            <div
              className="fr-p-2w fr-mb-2w"
              style={{ background: 'var(--error-950-100)', borderRadius: '4px' }}
            >
              <p className="fr-text--sm fr-mb-1w">
                Supprimer l'entrée <strong>{entry.code}</strong> ? Ses éventuels
                enfants deviendront des racines.
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
              <Input
                label="Annotations (séparées par des virgules)"
                hintText="Ex : marché public, travaux, BTP"
                nativeInputProps={{
                  value: form.annotations,
                  onChange: (e) => setForm({ ...form, annotations: e.target.value }),
                }}
              />
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
                      <li key={ann}>
                        <Tag>{ann}</Tag>
                      </li>
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
