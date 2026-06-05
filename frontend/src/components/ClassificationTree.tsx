import React, { useState } from 'react';
import { Button } from '@codegouvfr/react-dsfr/Button';
import type { ClassificationTreeNode } from '../types/classification';
import { ClassificationCard } from './ClassificationCard';
import { createEntry } from '../api/client';

// Couleurs de fond par niveau de profondeur
const LEVEL_COLORS: Record<number, string> = {
  0: 'var(--blue-france-925)',   // bleu DSFR foncé (racine)
  1: 'var(--blue-france-950)',   // bleu DSFR clair (niveau 1)
  2: 'var(--grey-975)',          // gris clair (niveau 2+)
};

const levelColor = (level: number) => LEVEL_COLORS[Math.min(level, 2)];

interface ClassificationTreeProps {
  nodes: ClassificationTreeNode[];
  type: string;
  onRefresh?: () => void;
}

interface AddChildFormProps {
  parentCode: string;
  type: string;
  onAdded: () => void;
  onCancel: () => void;
}

function AddChildForm({ parentCode, type, onAdded, onCancel }: AddChildFormProps) {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [definition, setDefinition] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nom || !definition) {
      setError('Tous les champs sont requis.');
      return;
    }
    try {
      await createEntry(type, { code, nom, definition, annotations: [], parent_code: parentCode });
      onAdded();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Erreur lors de la création.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fr-p-2w fr-mt-1w"
      style={{ background: 'var(--grey-1000)', borderLeft: '3px solid var(--blue-france-sun-113)' }}
    >
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-3">
          <label className="fr-label fr-text--sm" htmlFor={`code-${parentCode}`}>Code</label>
          <input className="fr-input" id={`code-${parentCode}`} value={code} onChange={e => setCode(e.target.value)} placeholder={`${parentCode}_01`} />
        </div>
        <div className="fr-col-12 fr-col-md-4">
          <label className="fr-label fr-text--sm" htmlFor={`nom-${parentCode}`}>Nom</label>
          <input className="fr-input" id={`nom-${parentCode}`} value={nom} onChange={e => setNom(e.target.value)} />
        </div>
        <div className="fr-col-12 fr-col-md-5">
          <label className="fr-label fr-text--sm" htmlFor={`def-${parentCode}`}>Définition</label>
          <input className="fr-input" id={`def-${parentCode}`} value={definition} onChange={e => setDefinition(e.target.value)} />
        </div>
      </div>
      {error && <p className="fr-error-text fr-mt-1w">{error}</p>}
      <div className="fr-btns-group fr-btns-group--inline fr-mt-1w">
        <Button type="submit" size="small">Ajouter</Button>
        <Button type="button" size="small" priority="secondary" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

interface TreeNodeRowProps {
  node: ClassificationTreeNode;
  type: string;
  onSelectEntry: (node: ClassificationTreeNode) => void;
  selectedCode: string | null;
  onRefresh?: () => void;
}

function TreeNodeRow({ node, type, onSelectEntry, selectedCode, onRefresh }: TreeNodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const hasChildren = node.children.length > 0;
  const isSelected = selectedCode === node.code;

  return (
    <li style={{ listStyle: 'none' }}>
      <div
        className="fr-p-1w fr-mb-1w"
        style={{
          background: levelColor(node.level),
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: isSelected ? '2px solid var(--blue-france-sun-113)' : '1px solid transparent',
          cursor: 'pointer',
        }}
        onClick={() => onSelectEntry(node)}
      >
        {/* Chevron expand/collapse */}
        {hasChildren ? (
          <button
            className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            title={expanded ? 'Réduire' : 'Développer'}
            aria-expanded={expanded}
          >
            <span
              className={expanded ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-right-s-line'}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span style={{ width: '32px', display: 'inline-block' }} />
        )}

        {/* Indentation visuelle selon le niveau */}
        {node.level > 0 && (
          <span style={{ display: 'inline-block', width: `${node.level * 12}px` }} />
        )}

        <span className="fr-text--sm" style={{ flex: 1, fontWeight: node.level === 0 ? 700 : 400 }}>
          <code className="fr-mr-1w" style={{ fontSize: '0.75rem', color: 'var(--blue-france-sun-113)' }}>
            {node.code}
          </code>
          {node.nom}
        </span>

        {/* Bouton ajout d'enfant */}
        <button
          className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          title="Ajouter un enfant"
          onClick={(e) => { e.stopPropagation(); setShowAddForm(!showAddForm); }}
        >
          <span className="fr-icon-add-line" aria-hidden="true" />
        </button>
      </div>

      {showAddForm && (
        <AddChildForm
          parentCode={node.code}
          type={type}
          onAdded={() => { setShowAddForm(false); onRefresh?.(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {hasChildren && expanded && (
        <ul style={{ paddingLeft: '16px', margin: 0 }}>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.code}
              node={child}
              type={type}
              onSelectEntry={onSelectEntry}
              selectedCode={selectedCode}
              onRefresh={onRefresh}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ClassificationTree({ nodes, type, onRefresh }: ClassificationTreeProps) {
  const [selectedNode, setSelectedNode] = useState<ClassificationTreeNode | null>(null);

  if (nodes.length === 0) {
    return (
      <p className="fr-text--sm fr-text--mention">
        Aucune entrée dans cette classification.
      </p>
    );
  }

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {/* Colonne arbre */}
      <div className="fr-col-12 fr-col-md-7">
        <ul style={{ padding: 0, margin: 0 }}>
          {nodes.map((node) => (
            <TreeNodeRow
              key={node.code}
              node={node}
              type={type}
              onSelectEntry={setSelectedNode}
              selectedCode={selectedNode?.code ?? null}
              onRefresh={onRefresh}
            />
          ))}
        </ul>
      </div>

      {/* Panneau latéral détail */}
      <div className="fr-col-12 fr-col-md-5">
        {selectedNode ? (
          <ClassificationCard
            entry={selectedNode}
            type={type}
            onUpdated={(updated) => {
              // Conserve children et level du nœud sélectionné lors de la mise à jour
              setSelectedNode({ ...selectedNode, ...updated, children: selectedNode.children, level: selectedNode.level });
              onRefresh?.();
            }}
          />
        ) : (
          <div className="fr-p-3w" style={{ background: 'var(--grey-975)', borderRadius: '8px' }}>
            <p className="fr-text--sm fr-text--mention">
              Sélectionnez une entrée dans l'arbre pour afficher ses détails.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
