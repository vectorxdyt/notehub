import { isCurriculumLesson } from './curriculum.mjs';
import { verifiedGoogleEmail } from './google-identity.mjs';
/** Shared authorization and input checks. No credentials or Firebase SDK imports. */
export function allowedTeacher(
  claims: { email?: string; email_verified?: boolean; firebase?: { sign_in_provider?: string } },
  teacherEmails: string | undefined,
): boolean {
  const approved = (teacherEmails ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  const email = verifiedGoogleEmail(claims);
  return approved.length > 0 && email !== null && approved.includes(email);
}

export const validId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);

/** Only untransformed JPEGs uploaded into this app's Cloudinary folder are accepted. */
export function imagePath(value: unknown, cloudName: string): string | null {
  if (typeof value !== 'string' || !/^[a-z0-9_-]+$/.test(cloudName)) return null;
  const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!value.startsWith(prefix)) return null;
  const match = /^v[0-9]+\/(notehub\/([0-9a-f-]+))\.jpg$/.exec(value.slice(prefix.length));
  return match && validId(match[2]) ? match[1] : null;
}

type UploadReceipt = { url?: string; owner?: string; lessonId?: string; cleanupPending?: boolean };

export function canAttachUpload(record: unknown, uid: string, url: string): boolean {
  if (!record || typeof record !== 'object') return false;
  const receipt = record as UploadReceipt;
  return receipt.owner === uid && receipt.url === url && !receipt.lessonId && !receipt.cleanupPending;
}

export function canDiscardUpload(record: unknown, uid: string, url: string): boolean {
  if (!record || typeof record !== 'object') return false;
  const receipt = record as UploadReceipt;
  return receipt.owner === uid && receipt.url === url && !receipt.lessonId;
}

/** Normalizes an optional teacher-authored plain-text summary. Undefined means invalid input. */
export function sanitizeKeyIdeas(value: unknown): string | undefined {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > 1500) return undefined;
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export function validLesson(value: unknown, cloudName: string): value is {
  title: string; topic: string; date: string; description: string; keyIdeas?: string; images: string[]; curriculumLesson: string;
} {
  if (!value || typeof value !== 'object') return false;
  const { title, topic, date, description, keyIdeas, images, curriculumLesson } = value as Record<string, unknown>;
  return typeof title === 'string' && title.trim().length > 0 && title.length <= 120 &&
    topic === 'Calculus' && isCurriculumLesson(curriculumLesson) &&
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date &&
    typeof description === 'string' && description.length <= 1000 &&
    sanitizeKeyIdeas(keyIdeas) !== undefined &&
    Array.isArray(images) && images.length >= 1 && images.length <= 8 &&
    new Set(images).size === images.length && images.every(url => imagePath(url, cloudName) !== null);
}
