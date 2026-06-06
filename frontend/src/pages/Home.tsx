import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { getClassificationMetas } from '../api/client';
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

  // Classe les classifications par famille
  const byFamily: Record<number, ClassificationMeta[]> = {};
  for (const meta of metas) {
    if (meta.family_id !== null) {
      byFamily[meta.family_id] = [...(byFamily[meta.family_id] ?? []), meta];
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

      {/* Domaines */}
      <h2 className="fr-h4 fr-mb-3w">Domaines</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
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
                  background: `rgba(${parseInt(family.color.slice(1,3),16)}, ${parseInt(family.color.slice(3,5),16)}, ${parseInt(family.color.slice(5,7),16)}, 0.10)`,
                  border: `2px solid ${family.color}`,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  cursor: familyMetas.length > 0 ? 'pointer' : 'default',
                  textAlign: 'center',
                  minHeight: '90px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (familyMetas.length > 0) (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px rgba(0,0,0,0.15)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <span style={{ color: family.color, fontWeight: 900, fontSize: '1rem' }}>
                  #{family.id}
                </span>
                <span style={{ fontWeight: 600, color: family.color, fontSize: '1.05rem', lineHeight: 1.3 }}>
                  {family.name}
                </span>
                {familyMetas.length > 0 && (
                  <span className="fr-badge fr-badge--sm" style={{
                    background: family.color,
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    marginTop: '2px',
                  }}>
                    {familyMetas.length} classification{familyMetas.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
