import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { getClassificationMetas, setFamilyIdInStorage } from '../api/client';
import { openImportModal, IMPORT_EVENT } from '../components/ImportPanel';
import { FAMILIES } from '../constants/families';
import type { ClassificationMeta } from '../api/client';

export function Home() {
  const [metas, setMetas] = useState<ClassificationMeta[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Classe les classifications par famille
  const byFamily: Record<number, ClassificationMeta[]> = {};
  const unassigned: ClassificationMeta[] = [];
  for (const meta of metas) {
    if (meta.family_id !== null) {
      byFamily[meta.family_id] = [...(byFamily[meta.family_id] ?? []), meta];
    } else {
      unassigned.push(meta);
    }
  }

  return (
    <div className="fr-container fr-py-6w">
      {/* En-tête */}
      <div className="fr-mb-6w">
        <h1 className="fr-h1">Classif'Actes</h1>
        <p className="fr-text--lead">
          Gérez, consultez et importez les classifications ontologiques utilisées pour
          qualifier les actes administratifs français. Cet outil est destiné aux équipes
          de la Direction Générale des Collectivités Locales (DGCL).
        </p>
        <div className="fr-mt-3w">
          <Button
            iconId="fr-icon-upload-line"
            priority="primary"
            onClick={() => openImportModal()}
          >
            Importer une classification
          </Button>
        </div>
      </div>

      {/* Grandes familles */}
      <h2 className="fr-h4 fr-mb-3w">Grandes familles de classifications</h2>
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        {FAMILIES.map((family) => {
          const familyMetas = byFamily[family.id] ?? [];
          return (
            <div key={family.id} className="fr-col-12 fr-col-sm-6 fr-col-md-4">
              <div
                onClick={() => {
                  if (familyMetas.length === 1) {
                    navigate(`/classifications/${encodeURIComponent(familyMetas[0].type)}`);
                  } else if (familyMetas.length > 1) {
                    navigate('/classifications');
                  }
                }}
                style={{
                  background: `rgba(${parseInt(family.color.slice(1,3),16)}, ${parseInt(family.color.slice(3,5),16)}, ${parseInt(family.color.slice(5,7),16)}, 0.12)`,
                  border: `2px solid ${family.color}`,
                  borderRadius: '8px',
                  padding: '24px 20px',
                  cursor: familyMetas.length > 0 ? 'pointer' : 'default',
                  textAlign: 'center',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (familyMetas.length > 0) (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px rgba(0,0,0,0.15)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <span
                  className="fr-text--sm"
                  style={{ color: family.color, fontWeight: 700, fontSize: '0.8rem' }}
                >
                  #{family.id}
                </span>
                <span style={{ fontWeight: 600, color: family.color, fontSize: '1rem', lineHeight: 1.3 }}>
                  {family.name}
                </span>
                {familyMetas.length > 0 && (
                  <span className="fr-badge fr-badge--sm" style={{
                    background: family.color,
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    marginTop: '4px',
                  }}>
                    {familyMetas.length} classification{familyMetas.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Classifications disponibles */}
      {!loading && metas.length > 0 && (
        <>
          <h2 className="fr-h4 fr-mb-3w">Toutes les classifications</h2>
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
                      <select
                        style={{ fontSize: '0.75rem', border: '1px solid var(--border-default-grey)', borderRadius: '4px', padding: '4px 8px' }}
                        value={meta.family_id ?? ''}
                        onChange={(e) => handleAssignFamily(meta.type, e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">— Famille —</option>
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
        </>
      )}
      {!loading && metas.length === 0 && (
        <p className="fr-text--sm fr-text--mention">
          Aucune classification chargée. Importez un fichier JSON pour commencer.
        </p>
      )}
    </div>
  );
}
