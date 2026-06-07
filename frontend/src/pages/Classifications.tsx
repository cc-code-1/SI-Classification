import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { getClassificationMetas, setFamilyIdInStorage, deleteClassification, createClassification } from '../api/client';
import { openImportModal, IMPORT_EVENT } from '../components/ImportPanel';
import { FAMILIES } from '../constants/families';
import type { ClassificationMeta } from '../api/client';

export function Classifications() {
  const [metas, setMetas] = useState<ClassificationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadMetas = async () => {
    try {
      const data = await getClassificationMetas();
      setMetas(data);
    } catch {
      /* backend pas encore démarré */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetas();
    const onImported = () => loadMetas();
    window.addEventListener(IMPORT_EVENT, onImported);
    return () => window.removeEventListener(IMPORT_EVENT, onImported);
  }, []);

  const handleAssignFamily = (type: string, familyId: number | null) => {
    setFamilyIdInStorage(type, familyId);
    setMetas((prev) =>
      prev.map((m) => (m.type === type ? { ...m, family_id: familyId } : m))
    );
  };

  const handleCreate = async () => {
    const type = newType.trim();
    if (!type) { setCreateError('Le nom de la classification est obligatoire.'); return; }
    if (metas.some((m) => m.type === type)) {
      setCreateError('Une classification avec ce nom existe déjà.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createClassification(type, newDescription.trim());
      setShowCreate(false);
      setNewType('');
      setNewDescription('');
      navigate(`/classifications/${encodeURIComponent(type)}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(msg ?? 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (type: string) => {
    if (!window.confirm(`Supprimer la classification « ${type} » ? Cette action est irréversible.`)) return;
    setDeletingType(type);
    try {
      await deleteClassification(type);
      setMetas((prev) => prev.filter((m) => m.type !== type));
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeletingType(null);
    }
  };

  return (
    <div className="fr-container fr-py-6w">
      <div className="fr-mb-4w" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="fr-h3" style={{ margin: 0 }}>Toutes les classifications</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button iconId="fr-icon-add-line" priority="secondary" onClick={() => { setShowCreate(true); setCreateError(''); }}>
            Créer
          </Button>
          <Button iconId="fr-icon-upload-line" priority="primary" onClick={() => openImportModal()}>
            Importer
          </Button>
        </div>
      </div>

      {showCreate && (
        <div
          style={{
            border: '1px solid var(--border-default-grey)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
            background: 'var(--background-alt-grey)',
          }}
        >
          <h2 className="fr-h6" style={{ marginTop: 0 }}>Nouvelle classification</h2>
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="new-type-input">
              Nom de la classification
              <span className="fr-hint-text">Identifiant unique. Ex : « sous-domaine », « matière »</span>
            </label>
            <input
              id="new-type-input"
              className="fr-input"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="sous-domaine"
              autoFocus
            />
          </div>
          <div className="fr-input-group fr-mt-2w">
            <label className="fr-label" htmlFor="new-desc-input">Description (facultatif)</label>
            <input
              id="new-desc-input"
              className="fr-input"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          {createError && <p className="fr-error-text fr-mt-1w">{createError}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button priority="primary" disabled={creating} onClick={handleCreate}>
              {creating ? 'Création…' : 'Créer et ouvrir'}
            </Button>
            <Button priority="secondary" onClick={() => { setShowCreate(false); setNewType(''); setNewDescription(''); setCreateError(''); }}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {loading && <p className="fr-text--sm fr-text--mention">Chargement…</p>}

      {!loading && metas.length === 0 && (
        <p className="fr-text--sm fr-text--mention">
          Aucune classification chargée. Importez un fichier JSON pour commencer.
        </p>
      )}

      {!loading && metas.length > 0 && (
        <div className="fr-grid-row fr-grid-row--gutters">
          {metas.map((meta) => {
            const family = FAMILIES.find((f) => f.id === meta.family_id);
            return (
              <div key={meta.type} className="fr-col-12 fr-col-md-4">
                <div
                  style={{
                    border: `1px solid ${family ? family.color : 'var(--border-default-grey)'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{meta.type}</span>
                    {family && (
                      <span
                        className="fr-badge fr-badge--sm"
                        style={{
                          background: `rgba(${parseInt(family.color.slice(1,3),16)}, ${parseInt(family.color.slice(3,5),16)}, ${parseInt(family.color.slice(5,7),16)}, 0.15)`,
                          color: family.color,
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          border: `1px solid ${family.color}`,
                        }}
                      >
                        {family.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      priority="primary"
                      onClick={() => navigate(`/classifications/${encodeURIComponent(meta.type)}`)}
                    >
                      Ouvrir
                    </Button>
                    <button
                      title="Supprimer cette classification"
                      disabled={deletingType === meta.type}
                      onClick={() => handleDelete(meta.type)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-default-grey)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: 'var(--error-425)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span className="fr-icon-delete-line" aria-hidden="true" style={{ fontSize: '1rem' }} />
                    </button>
                    <select
                      style={{ fontSize: '0.75rem', border: '1px solid var(--border-default-grey)', borderRadius: '4px', padding: '4px 8px' }}
                      value={meta.family_id ?? ''}
                      onChange={(e) => handleAssignFamily(meta.type, e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">— Domaine —</option>
                      {FAMILIES.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
