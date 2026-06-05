export interface ClassificationEntry {
  id: string;
  code: string;
  nom: string;
  definition: string;
  annotations: string[];
  parent_code: string | null;
  children?: ClassificationEntry[];
}

export interface ClassificationFile {
  type: string;
  version: string;
  description: string;
  entries: ClassificationEntry[];
}

export interface ClassificationTreeNode extends ClassificationEntry {
  children: ClassificationTreeNode[];
  level: number;
}
