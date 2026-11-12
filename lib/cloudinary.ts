import 'server-only';
import { imagePath, validId } from './security';

export const photoStorageConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

async function request(action: 'upload' | 'destroy', form: FormData) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!photoStorageConfigured() || !/^[a-z0-9_-]+$/.test(cloud!)) throw new Error('Photo storage is not configured.');
  const credentials = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/${action}`, {
    method: 'POST', headers: { Authorization: `Basic ${credentials}` }, body: form, signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error('Photo storage is unavailable or its free allowance has been reached.');
  return response.json();
}

export async function uploadPhoto(file: File, id: string): Promise<string> {
  if (!validId(id)) throw new Error('Invalid photo ID.');
  const form = new FormData();
  form.set('file', file);
  form.set('public_id', `notehub/${id}`);
  form.set('overwrite', 'false');
  const result = await request('upload', form);
  if (result.resource_type !== 'image' || result.format !== 'jpg' || result.public_id !== `notehub/${id}` ||
      imagePath(result.secure_url, process.env.CLOUDINARY_CLOUD_NAME!) !== `notehub/${id}`) {
    throw new Error('Photo storage returned an unexpected image.');
  }
  return result.secure_url;
}

export async function deletePhoto(publicId: string) {
  if (!publicId.startsWith('notehub/') || !validId(publicId.slice(8))) throw new Error('Invalid photo ID.');
  const form = new FormData();
  form.set('public_id', publicId);
  form.set('invalidate', 'true');
  const result = await request('destroy', form);
  if (!['ok', 'not found'].includes(result.result)) throw new Error('Photo could not be deleted.');
}
