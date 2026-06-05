import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ClassificationTree } from '../components/ClassificationTree';
import { ExportPanel } from '../components/ExportPanel';
import { getClassificationTree } from '../api/client';
import type { ClassificationTreeNode } from '../types/classification';

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
            <span style={{ color: 'var(--blue-france-sun-113)' }}>
              {decodeURIComponent(type)}
            </span>
          </h1>
        </div>
        <ExportPanel type={decodeURIComponent(type)} />
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
          type={decodeURIComponent(type)}
          onRefresh={loadTree}
        />
      )}
    </div>
  );
}
