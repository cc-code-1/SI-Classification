import React, { useState } from 'react';
import { Button } from '@codegouvfr/react-dsfr/Button';
import type { ClassificationTreeNode } from '../types/classification';
import { ClassificationCard } from './ClassificationCard';
import { createEntry } from '../api/client';
import { familyLevelColor, familyLevelBg } from '../constants/families';

// Collecte récursivement tous les codes de nœuds ayant au moins un enfant
function collectCodesWithChildren(nodes: ClassificationTreeNode[]): string[] {
  const codes: string[] = [];
  for (const node of nodes) {
    if (node.children.length > 0) {
      codes.push(node.code);
      codes.push(...collectCodesWithChildren(node.children));
    }
  }
  return codes;
}

// Statistiques globales calculées depuis les racines de l'arbre
function computeStats(nodes: ClassificationTreeNode[]): { total: number; roots: number; maxDepth: number } {
  let total = 0;
  let maxLevel = 0;
  const recurse = (list: ClassificationTreeNode[]) => {
    for (const node of list) {
      total += 1;
      if (node.level > maxLevel) maxLevel = node.level;
      recurse(node.children);
    }
  };
  recurse(nodes);
  return { total, roots: nodes.length, maxDepth: nodes.length > 0 ? maxLevel + 1 : 0 };
}

interface ClassificationTreeProps {
  nodes: ClassificationTreeNode[];
  type: string;
  onRefresh?: () => void;
  familyColor?: string;
}

function suggestNextCode(parentCode: string, siblings: ClassificationTreeNode[]): string {
  if (siblings.length === 0) return `${parentCode}_01`;
  let maxNum = -1;
  let prefix = '';
  let padLen = 2;
  for (const s of siblings) {
    const m = s.code.match(/^(.*?)(\d+)$/);
    if (m) {
      const n = parseInt(m[2]);
      if (n > maxNum) { maxNum = n; prefix = m[1]; padLen = m[2].length; }
    }
  }
  if (maxNum >= 0) return `${prefix}${String(maxNum + 1).padStart(padLen, '0')}`;
  return `${parentCode}_${String(siblings.length + 1).padStart(2, '0')}`;
}

interface AddChildFormProps {
  parentCode: string;
  siblings: ClassificationTreeNode[];
  type: string;
  onAdded: () => void;
  onCancel: () => void;
}

function AddChildForm({ parentCode, siblings, type, onAdded, onCancel }: AddChildFormProps) {
  const [code, setCode] = useState(() => suggestNextCode(parentCode, siblings));
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
  collapsed: Set<string>;
  onToggle: (code: string) => void;
  forceExpand: boolean;
  onRefresh?: () => void;
  familyColor: string;
}

function TreeNodeRow({
  node, type, onSelectEntry, selectedCode, collapsed, onToggle, forceExpand, onRefresh, familyColor,
}: TreeNodeRowProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const hasChildren = node.children.length > 0;
  const isSelected = selectedCode === node.code;
  const expanded = forceExpand || !collapsed.has(node.code);

  return (
    <li style={{ listStyle: 'none' }}>
      <div
        style={{
          background: familyLevelBg(familyColor, node.level),
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: `4px solid ${familyLevelColor(familyColor, node.level)}`,
          boxShadow: isSelected ? `0 0 0 2px ${familyLevelColor(familyColor, 0)}` : 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          marginBottom: '3px',
        }}
        onClick={() => onSelectEntry(node)}
      >
        {/* Chevron expand/collapse */}
        {hasChildren ? (
          <button
            className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
            onClick={(e) => { e.stopPropagation(); onToggle(node.code); }}
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
          siblings={node.children}
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
              collapsed={collapsed}
              onToggle={onToggle}
              forceExpand={forceExpand}
              onRefresh={onRefresh}
              familyColor={familyColor}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Filtre récursif : conserve un nœud si lui-même correspond à la recherche,
 * OU si l'un de ses descendants correspond (on garde alors le parent pour
 * préserver le chemin hiérarchique). La recherche porte sur code, nom,
 * définition et annotations.
 */
function filterTree(
  nodes: ClassificationTreeNode[],
  query: string
): { filtered: ClassificationTreeNode[]; count: number } {
  const q = query.trim().toLowerCase();
  if (!q) return { filtered: nodes, count: 0 };

  let count = 0;
  const recurse = (list: ClassificationTreeNode[]): ClassificationTreeNode[] => {
    const result: ClassificationTreeNode[] = [];
    for (const node of list) {
      const selfMatch =
        node.code.toLowerCase().includes(q) ||
        node.nom.toLowerCase().includes(q) ||
        node.definition.toLowerCase().includes(q) ||
        node.annotations.some((a) => a.toLowerCase().includes(q));
      const keptChildren = recurse(node.children);
      if (selfMatch || keptChildren.length > 0) {
        if (selfMatch) count += 1;
        result.push({ ...node, children: keptChildren });
      }
    }
    return result;
  };

  const filtered = recurse(nodes);
  return { filtered, count };
}

// Construit une map plate code -> node en aplatissant l'arbre
function buildNodeMap(nodes: ClassificationTreeNode[]): Map<string, ClassificationTreeNode> {
  const map = new Map<string, ClassificationTreeNode>();
  const recurse = (list: ClassificationTreeNode[]) => {
    for (const node of list) {
      map.set(node.code, node);
      recurse(node.children);
    }
  };
  recurse(nodes);
  return map;
}

export function ClassificationTree({ nodes, type, onRefresh, familyColor = '#000091' }: ClassificationTreeProps) {
  const [selectedNode, setSelectedNode] = useState<ClassificationTreeNode | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (nodes.length === 0) {
    return (
      <p className="fr-text--sm fr-text--mention">
        Aucune entrée dans cette classification.
      </p>
    );
  }

  const { filtered, count } = filterTree(nodes, search);
  const forceExpand = search.trim().length > 0;
  const stats = computeStats(nodes);

  const handleToggle = (code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(collectCodesWithChildren(nodes)));

  // Ancêtres du nœud sélectionné, remontés via parent_code
  let ancestors: { code: string; nom: string }[] = [];
  if (selectedNode?.parent_code) {
    const nodeMap = buildNodeMap(nodes);
    const path: { code: string; nom: string }[] = [];
    let current = selectedNode.parent_code;
    while (current) {
      const parent = nodeMap.get(current);
      if (!parent) break;
      path.unshift({ code: parent.code, nom: parent.nom });
      current = parent.parent_code ?? '';
    }
    ancestors = path;
  }

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {/* Colonne arbre */}
      <div className="fr-col-12 fr-col-md-7">
        {/* Barre de statistiques */}
        <div
          className="fr-text--sm fr-p-2w fr-mb-2w"
          style={{ background: 'var(--grey-975)', borderRadius: '4px' }}
        >
          📊 {stats.total} entrée{stats.total > 1 ? 's' : ''} · {stats.roots} racine{stats.roots > 1 ? 's' : ''} · profondeur {stats.maxDepth}
        </div>

        {/* Contrôles de dépliage */}
        <div className="fr-btns-group fr-btns-group--inline fr-mb-2w">
          <Button size="small" priority="tertiary" iconId="fr-icon-arrow-down-s-line" onClick={expandAll}>
            Tout déplier
          </Button>
          <Button size="small" priority="tertiary" iconId="fr-icon-arrow-right-s-line" onClick={collapseAll}>
            Tout replier
          </Button>
        </div>

        {/* Barre de recherche */}
        <div className="fr-search-bar fr-mb-2w" role="search">
          <label className="fr-label" htmlFor="tree-search">Rechercher</label>
          <input
            className="fr-input"
            id="tree-search"
            type="search"
            placeholder="Code, nom, définition ou annotation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="fr-btn" title="Rechercher" type="button">
            Rechercher
          </button>
        </div>
        {search.trim() && (
          <p className="fr-text--xs fr-mb-1w" style={{ color: 'var(--text-mention-grey)' }}>
            {count} entrée(s) correspondante(s)
          </p>
        )}
        <ul style={{ padding: 0, margin: 0 }}>
          {filtered.map((node) => (
            <TreeNodeRow
              key={node.code}
              node={node}
              type={type}
              onSelectEntry={setSelectedNode}
              selectedCode={selectedNode?.code ?? null}
              collapsed={collapsed}
              onToggle={handleToggle}
              forceExpand={forceExpand}
              onRefresh={onRefresh}
              familyColor={familyColor}
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
            ancestors={ancestors}
            onUpdated={(updated) => {
              // Conserve children et level du nœud sélectionné lors de la mise à jour
              setSelectedNode({ ...selectedNode, ...updated, children: selectedNode.children, level: selectedNode.level });
              onRefresh?.();
            }}
            onDeleted={() => {
              setSelectedNode(null);
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
