import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { getClassificationMetas, setFamilyIdInStorage, deleteClassification } from '../api/client';
import { openImportModal, IMPORT_EVENT } from '../components/ImportPanel';
import { ConfirmModal } from '../components/ConfirmModal';
import { FAMILIES } from '../constants/families';
import type { ClassificationMeta } from '../api/client';

export function FamilyPage() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const [metas, setMetas] = useState<ClassificationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const familyIdNum = familyId ? parseInt(familyId) : null;
  const family = FAMILIES.find((f) => f.id === familyIdNum);

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

  const handleAssignFamily = (type: string, newFamilyId: number | null) => {
    setFamilyIdInStorage(type, newFamilyId);
    setMetas((prev) =>
      prev.map((m) => (m.type === type ? { ...m, family_id: newFamilyId } : m))
    );
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const toDelete = confirmDelete;
    setConfirmDelete(null);
    setDeletingType(toDelete);
    try {
      await deleteClassification(toDelete);
      setMetas((prev) => prev.filter((m) => m.type !== toDelete));
    } catch {
      /* ignore */
    } finally {
      setDeletingType(null);
    }
  };

  const familyMetas = metas.filter((m) => m.family_id === familyIdNum);

  if (!family) {
    return (
      <div className="fr-container fr-py-6w">
        <p className="fr-text--sm fr-text--mention">Domaine introuvable.</p>
      </div>
    );
  }

  const r = parseInt(family.color.slice(1, 3), 16);
  const g = parseInt(family.color.slice(3, 5), 16);
  const b = parseInt(family.color.slice(5, 7), 16);

  return (
    <div className="fr-container fr-py-6w">
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer la classification"
          message={`Supprimer « ${confirmDelete} » ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* En-tête */}
      <div className="fr-mb-4w">
        <Button
          iconId="fr-icon-arrow-left-line"
          priority="tertiary no outline"
          onClick={() => navigate('/classifications')}
        >
          Toutes les classifications
        </Button>
        <div
          style={{
            background: `rgba(${r}, ${g}, ${b}, 0.10)`,
            border: `2px solid ${family.color}`,
            borderRadius: '8px',
            padding: '16px 20px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <span style={{ color: family.color, fontWeight: 900, fontSize: '0.9rem' }}>#{family.id}</span>
            <h1 className="fr-h4" style={{ margin: '4px 0 0', color: family.color }}>{family.name}</h1>
          </div>
          <Button iconId="fr-icon-upload-line" priority="primary" onClick={() => openImportModal()}>
            Importer
          </Button>
        </div>
      </div>

      {loading && <p className="fr-text--sm fr-text--mention">Chargement…</p>}

      {!loading && familyMetas.length === 0 && (
        <p className="fr-text--sm fr-text--mention">
          Aucune classification rattachée à ce domaine. Importez un fichier JSON ou rattachez des classifications depuis la liste.
        </p>
      )}

      {!loading && familyMetas.length > 0 && (
        <div className="fr-grid-row fr-grid-row--gutters">
          {familyMetas.map((meta) => (
            <div key={meta.type} className="fr-col-12 fr-col-md-4">
              <div
                style={{
                  border: `1px solid ${family.color}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{meta.type}</span>
                  <span
                    className="fr-badge fr-badge--sm"
                    style={{
                      background: `rgba(${r}, ${g}, ${b}, 0.15)`,
                      color: family.color,
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      border: `1px solid ${family.color}`,
                    }}
                  >
                    {family.name}
                  </span>
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
                    onClick={() => setConfirmDelete(meta.type)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-default-grey)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      color: 'var(--error-425)',
                      display: 'flex',
                      alignItems: 'center',
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
          ))}
        </div>
      )}
    </div>
  );
}
