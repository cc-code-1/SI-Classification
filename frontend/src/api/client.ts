import axios from 'axios';
import type { ClassificationEntry, ClassificationFile, ClassificationTreeNode } from '../types/classification';

const proxyBase = window.location.pathname.replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${proxyBase}/api`,
  headers: { 'Content-Type': 'application/json' },
});

type AccessTokenProvider = () => Promise<string | undefined>;
let accessTokenProvider: AccessTokenProvider = async () => undefined;

export function setAccessTokenProvider(provider: AccessTokenProvider): void {
  accessTokenProvider = provider;
}

api.interceptors.request.use(async (config) => {
  const token = await accessTokenProvider();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

export async function getClassificationTypes(): Promise<string[]> {
  const res = await api.get<string[]>('/classifications');
  return res.data;
}

export interface ClassificationMeta {
  type: string;
  family_id: number | null;
}

export async function getClassificationMetas(): Promise<ClassificationMeta[]> {
  const res = await api.get<string[]>('/classifications');
  return res.data.map((type) => ({
    type,
    family_id: getFamilyIdFromStorage(type),
  }));
}

function getFamilyIdFromStorage(type: string): number | null {
  try {
    const stored = localStorage.getItem(`family_${type}`);
    return stored ? parseInt(stored) : null;
  } catch { return null; }
}

export function setFamilyIdInStorage(type: string, familyId: number | null): void {
  try {
    if (familyId === null) localStorage.removeItem(`family_${type}`);
    else localStorage.setItem(`family_${type}`, String(familyId));
  } catch {}
}

export async function getClassificationTree(type: string): Promise<ClassificationTreeNode[]> {
  const res = await api.get<ClassificationTreeNode[]>(`/classifications/${encodeURIComponent(type)}/tree`);
  return res.data;
}

export async function getClassificationEntries(type: string): Promise<ClassificationEntry[]> {
  const res = await api.get<ClassificationFile>(`/classifications/${encodeURIComponent(type)}`);
  return res.data.entries;
}

export async function createEntry(type: string, entry: Omit<ClassificationEntry, 'id'>): Promise<ClassificationEntry> {
  const res = await api.post<ClassificationEntry>(`/classifications/${encodeURIComponent(type)}/entries`, entry);
  return res.data;
}

export async function updateEntry(type: string, code: string, entry: Partial<ClassificationEntry>): Promise<ClassificationEntry> {
  const res = await api.put<ClassificationEntry>(`/classifications/${encodeURIComponent(type)}/entries/${encodeURIComponent(code)}`, entry);
  return res.data;
}

export async function deleteEntry(type: string, code: string): Promise<void> {
  await api.delete(`/classifications/${encodeURIComponent(type)}/entries/${encodeURIComponent(code)}`);
}

export interface ImportPreview {
  type: string;
  version: string;
  description: string;
  entry_count: number;
  was_converted: boolean;
  sample: ClassificationEntry[];
}

export async function previewImport(file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<ImportPreview>('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function importClassification(file: File): Promise<ClassificationFile> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<ClassificationFile>('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function exportClassification(type: string, format: 'nested' | 'flat' = 'nested'): Promise<Blob> {
  const res = await api.get(`/export/${encodeURIComponent(type)}`, { params: { format }, responseType: 'blob' });
  return res.data;
}

export async function exportClassificationCsv(type: string): Promise<Blob> {
  const res = await api.get(`/export/${encodeURIComponent(type)}/csv`, { responseType: 'blob' });
  return res.data;
}

export async function exportClassificationExcel(type: string): Promise<Blob> {
  const res = await api.get(`/export/${encodeURIComponent(type)}/xlsx`, { responseType: 'blob' });
  return res.data;
}

export async function importClassificationCsv(file: File, type: string): Promise<ClassificationFile> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<ClassificationFile>(`/import/csv?type=${encodeURIComponent(type)}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function importClassificationExcel(file: File, type: string): Promise<ClassificationFile> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<ClassificationFile>(`/import/excel?type=${encodeURIComponent(type)}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}
