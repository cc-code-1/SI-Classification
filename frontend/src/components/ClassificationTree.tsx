import { useState } from "react";
import { Button } from "@codegouvfr/react-dsfr/Button";
import type { ClassificationTreeNode, ClassificationEntry } from "../types/classification";
import ClassificationCard from "./ClassificationCard";

// Couleurs par niveau de hiérarchie (palette DSFR)
const LEVEL_COLORS = [
  { bg: "#000091", text: "#ffffff" }, // bleu DSFR — racine
  { bg: "#e8edff", text: "#000091" }, // bleu très clair — niveau 1
  { bg: "#f5f5fe", text: "#3a3a3a" }, // gris bleuté — niveau 2+
];

interface Props {
  nodes: ClassificationTreeNode[];
  type: string;
  onUpdate: (code: string, data: Partial<ClassificationEntry>) => void;
  onDelete: (code: string) => void;
}

interface NodeProps {
  node: ClassificationTreeNode;
  type: string;
  onUpdate: (code: string, data: Partial<ClassificationEntry>) => void;
  onDelete: (code: string) => void;
}

function TreeNode({ node, type, onUpdate, onDelete }: NodeProps) {
  const [expanded, setExpanded] = useState(node.level === 0);
  const [selected, setSelected] = useState(false);
  const hasChildren = node.children.length > 0;
  const colors = LEVEL_COLORS[Math.min(node.level, LEVEL_COLORS.length - 1)];

  return (
    <div style={{ marginLeft: node.level > 0 ? "1.5rem" : "0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          marginBottom: "0.25rem",
          borderRadius: "4px",
          background: selected ? colors.bg : "transparent",
          color: selected ? colors.text : "inherit",
          border: `1px solid ${colors.bg}`,
          cursor: "pointer",
        }}
        onClick={() => setSelected(!selected)}
      >
        {hasChildren && (
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 0.25rem",
              color: "inherit",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            aria-label={expanded ? "Réduire" : "Développer"}
          >
            <span className={`fr-icon-arrow-${expanded ? "up" : "down"}-s-line`} aria-hidden />
          </button>
        )}
        {!hasChildren && <span style={{ width: "1.5rem" }} />}

        <span style={{ fontWeight: node.level === 0 ? 700 : 500, flex: 1 }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontFamily: "monospace",
              background: colors.bg,
              color: colors.text,
              padding: "0.1rem 0.4rem",
              borderRadius: "3px",
              marginRight: "0.5rem",
            }}
          >
            {node.code}
          </span>
          {node.nom}
        </span>

        {hasChildren && (
          <span className="fr-badge fr-badge--sm fr-badge--blue-cumulus">
            {node.children.length}
          </span>
        )}
      </div>

      {selected && (
        <div className="fr-ml-3w fr-mb-2w">
          <ClassificationCard
            entry={node}
            onUpdate={(data) => onUpdate(node.code, data)}
            onDelete={() => onDelete(node.code)}
          />
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              type={type}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClassificationTree({ nodes, type, onUpdate, onDelete }: Props) {
  if (nodes.length === 0) {
    return (
      <div className="fr-alert fr-alert--info fr-mt-2w">
        <p>Aucune classification disponible. Importez un fichier JSON pour commencer.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="fr-mb-2w fr-text--sm fr-text--light">
        {nodes.length} entrée{nodes.length > 1 ? "s" : ""} racine{nodes.length > 1 ? "s" : ""} —
        cliquez sur une entrée pour voir ses détails
      </div>
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} type={type} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
