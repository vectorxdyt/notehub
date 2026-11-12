import {firestore} from '@/lib/firebase-admin';
import {imagePath, validId} from '@/lib/security';
import {configured, failure, viewerAccess} from '@/lib/server';

export const runtime = 'nodejs';
const MAX_PHOTO_BYTES = 3_500_000;

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  if (!configured()) return Response.json({error: 'Photo storage is not configured.'}, {status: 404});
  const {id} = await params;
  if (!validId(id)) return Response.json({error: 'Invalid photo.'}, {status: 400});
  try {
    const access = await viewerAccess();
    if (!access.authorized) return Response.json({error: 'Sign in with an approved student account to view this photo.'}, {status: 401, headers: {'Cache-Control': 'no-store'}});
    const receipt = await firestore().collection('uploads').doc(id).get();
    const data = receipt.data();
    const url = data?.url;
    if (!receipt.exists || typeof data?.lessonId !== 'string' || imagePath(url, process.env.CLOUDINARY_CLOUD_NAME!) !== `notehub/${id}`) {
      return Response.json({error: 'Photo not found.'}, {status: 404});
    }
    const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(15_000)});
    if (!response.ok || !response.body) throw new Error('Photo download failed.');
    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (!contentType.startsWith('image/jpeg') || contentLength > MAX_PHOTO_BYTES) throw new Error('Invalid stored photo.');
    return new Response(response.body, {headers: {
      'Content-Type': 'image/jpeg',
      ...(contentLength > 0 ? {'Content-Length': String(contentLength)} : {}),
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    }});
  } catch (error) { return failure(error); }
}
