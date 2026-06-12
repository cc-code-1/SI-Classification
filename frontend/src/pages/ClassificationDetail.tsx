import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ClassificationTree } from '../components/ClassificationTree';
import {
  getClassificationTree,
  getClassificationMetas,
  exportClassification,
  exportClassificationCsv,
  exportClassificationExcel,
  renameClassification,
} from '../api/client';
import type { ClassificationMeta } from '../api/client';
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [siblingMetas, setSiblingMetas] = useState<ClassificationMeta[]>([]);

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

  // Charge les frères/sœurs du même domaine pour la navigation
  useEffect(() => {
    if (!type) return;
    const decoded = decodeURIComponent(type);
    const familyId = getFamilyIdFromStorage(decoded);
    if (familyId === null) { setSiblingMetas([]); return; }
    getClassificationMetas().then((all) => {
      setSiblingMetas(all.filter((m) => m.family_id === familyId));
    }).catch(() => setSiblingMetas([]));
  }, [type]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  if (!type) return null;

  const decodedType = decodeURIComponent(type);
  const familyId = getFamilyIdFromStorage(decodedType);
  const family = FAMILIES.find((f) => f.id === familyId);
  const familyColor = family?.color ?? '#000091';

  const siblingIdx = siblingMetas.findIndex((m) => m.type === decodedType);
  const prevMeta = siblingIdx > 0 ? siblingMetas[siblingIdx - 1] : null;
  const nextMeta = siblingIdx >= 0 && siblingIdx < siblingMetas.length - 1 ? siblingMetas[siblingIdx + 1] : null;

  const handleRename = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === decodedType) { setEditingTitle(false); return; }
    setRenaming(true);
    try {
      await renameClassification(decodedType, trimmed);
      setEditingTitle(false);
      navigate(`/classifications/${encodeURIComponent(trimmed)}`, { replace: true });
    } catch {
      setError('Impossible de renommer la classification.');
    } finally {
      setRenaming(false);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            iconId="fr-icon-arrow-left-line"
            priority="tertiary no outline"
            onClick={() => navigate(family ? `/classifications/domaine/${family.id}` : '/')}
          >
            {family ? family.name : 'Retour'}
          </Button>

          {/* Navigation dans le domaine */}
          {(prevMeta || nextMeta) && (
            <span style={{ display: 'inline-flex', gap: '4px' }}>
              <button
                title={prevMeta ? `Précédent : ${prevMeta.type}` : ''}
                disabled={!prevMeta}
                onClick={() => prevMeta && navigate(`/classifications/${encodeURIComponent(prevMeta.type)}`)}
                style={{
                  background: 'none', border: '1px solid var(--border-default-grey)',
                  borderRadius: '4px', padding: '4px 8px', cursor: prevMeta ? 'pointer' : 'default',
                  opacity: prevMeta ? 1 : 0.35,
                }}
              >
                <span className="fr-icon-arrow-left-s-line" aria-hidden="true" />
              </button>
              <span style={{ fontSize: '0.75rem', alignSelf: 'center', color: 'var(--text-mention-grey)' }}>
                {siblingIdx + 1} / {siblingMetas.length}
              </span>
              <button
                title={nextMeta ? `Suivant : ${nextMeta.type}` : ''}
                disabled={!nextMeta}
                onClick={() => nextMeta && navigate(`/classifications/${encodeURIComponent(nextMeta.type)}`)}
                style={{
                  background: 'none', border: '1px solid var(--border-default-grey)',
                  borderRadius: '4px', padding: '4px 8px', cursor: nextMeta ? 'pointer' : 'default',
                  opacity: nextMeta ? 1 : 0.35,
                }}
              >
                <span className="fr-icon-arrow-right-s-line" aria-hidden="true" />
              </button>
            </span>
          )}

          {editingTitle ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <input
                className="fr-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingTitle(false); }}
                style={{ width: '260px', fontSize: '1.1rem' }}
                autoFocus
                disabled={renaming}
              />
              <Button size="small" priority="primary" onClick={handleRename} disabled={renaming}>
                {renaming ? '…' : 'Renommer'}
              </Button>
              <Button size="small" priority="secondary" onClick={() => setEditingTitle(false)} disabled={renaming}>
                Annuler
              </Button>
            </span>
          ) : (
            <h1 className="fr-h3 fr-mt-1w" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '8px', margin: 0 }}>
              <span style={{ color: familyColor }}>{decodedType}</span>
              <button
                title="Renommer cette classification"
                onClick={() => { setNewTitle(decodedType); setEditingTitle(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-mention-grey)', lineHeight: 1 }}
              >
                <span className="fr-icon-edit-line" aria-hidden="true" style={{ fontSize: '1rem' }} />
              </button>
            </h1>
          )}
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
