import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ClassificationTree } from '../components/ClassificationTree';
import {
  getClassificationTree,
  exportClassification,
  exportClassificationCsv,
  exportClassificationExcel,
} from '../api/client';
import type { ClassificationTreeNode } from '../types/classification';
import { FAMILIES } from '../constants/families';

function getFamilyIdFromStorage(type: string): number | null {
  try {
    const stored = localStorage.getItem(`family_${type}`);
    return stored ? parseInt(stored) : null;
  } catch { return null; }
}

export function ClassificationDetail() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<ClassificationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTree = useCallback(async () => {
    if (!type) return;
    setLoading(true);
    setError('');
    try {
      const tree = await getClassificationTree(decodeURIComponent(type));
      setNodes(tree);
    } catch {
      setError(`Impossible de charger la classification « ${type} ».`);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  if (!type) return null;

  const decodedType = decodeURIComponent(type);
  const familyId = getFamilyIdFromStorage(decodedType);
  const family = FAMILIES.find((f) => f.id === familyId);
  const familyColor = family?.color ?? '#000091';

  const handleExport = async (format: 'json-nested' | 'csv' | 'excel') => {
    try {
      let blob: Blob;
      let filename: string;
      if (format === 'json-nested') {
        blob = await exportClassification(decodedType, 'nested');
        filename = `${decodedType}.json`;
      } else if (format === 'csv') {
        blob = await exportClassificationCsv(decodedType);
        filename = `${decodedType}.csv`;
      } else {
        blob = await exportClassificationExcel(decodedType);
        filename = `${decodedType}.xlsx`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore export errors */
    }
  };

  return (
    <div className="fr-container fr-py-4w">
      {/* Barre d'actions */}
      <div
        className="fr-grid-row fr-grid-row--middle fr-mb-4w"
        style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}
      >
        <div>
          <Button
            iconId="fr-icon-arrow-left-line"
            priority="tertiary no outline"
            onClick={() => navigate('/')}
          >
            Retour
          </Button>
          <h1 className="fr-h3 fr-mt-1w" style={{ display: 'inline-block', marginLeft: '16px' }}>
            Classification :{' '}
            <span style={{ color: familyColor }}>
              {decodedType}
            </span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          {[
            { label: 'JSON', onClick: () => handleExport('json-nested') },
            { label: 'CSV', onClick: () => handleExport('csv') },
            { label: 'EXCEL', onClick: () => handleExport('excel') },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px', border: '1px solid var(--border-default-grey)',
                borderRadius: '4px', padding: '8px 12px', background: 'white',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              <span className="fr-icon-download-line" aria-hidden="true" style={{ fontSize: '1.2rem' }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert
          severity="error"
          title="Erreur"
          description={error}
          className="fr-mb-3w"
          small
        />
      )}

      {loading ? (
        <p className="fr-text--sm fr-text--mention">Chargement de l'arbre…</p>
      ) : (
        <ClassificationTree
          nodes={nodes}
          type={decodedType}
          onRefresh={loadTree}
          familyColor={familyColor}
        />
      )}
    </div>
  );
}
