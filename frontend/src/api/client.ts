import axios from 'axios';
import type { ClassificationEntry, ClassificationFile, ClassificationTreeNode } from '../types/classification';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function getClassificationTypes(): Promise<string[]> {
  const res = await api.get<string[]>('/classifications');
  return res.data;
}

export async function getClassificationTree(type: string): Promise<ClassificationTreeNode[]> {
  const res = await api.get<ClassificationTreeNode[]>(`/classifications/${encodeURIComponent(type)}/tree`);
  return res.data;
}

export async function getClassificationEntries(type: string): Promise<ClassificationEntry[]> {
  const res = await api.get<ClassificationFile>(`/classifications/${encodeURIComponent(type)}`);
  return res.data.entries;
}

export async function createEntry(
  type: string,
  entry: Omit<ClassificationEntry, 'id'>
): Promise<ClassificationEntry> {
  const res = await api.post<ClassificationEntry>(
    `/classifications/${encodeURIComponent(type)}/entries`,
    entry
  );
  return res.data;
}

export async function updateEntry(
  type: string,
  code: string,
  entry: Partial<ClassificationEntry>
): Promise<ClassificationEntry> {
  const res = await api.put<ClassificationEntry>(
    `/classifications/${encodeURIComponent(type)}/entries/${encodeURIComponent(code)}`,
    entry
  );
  return res.data;
}

export async function deleteEntry(type: string, code: string): Promise<void> {
  await api.delete(
    `/classifications/${encodeURIComponent(type)}/entries/${encodeURIComponent(code)}`
  );
}

export async function importClassification(file: File): Promise<ClassificationFile> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<ClassificationFile>('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function exportClassification(type: string): Promise<Blob> {
  const res = await api.get(`/export/${encodeURIComponent(type)}`, {
    responseType: 'blob',
  });
  return res.data;
}
