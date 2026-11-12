import { firestore } from '@/lib/firebase-admin';
import { deletePhoto } from '@/lib/cloudinary';
import { imagePath, validId } from '@/lib/security';
import { failure, sameOrigin, teacher } from '@/lib/server';

export const runtime = 'nodejs';
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  if (!await teacher()) return Response.json({ error: 'Please sign in as the teacher.' }, { status: 401 });
  const { id } = await params;
  if (!validId(id)) return Response.json({ error: 'Invalid lesson.' }, { status: 400 });
  try {
    const db = firestore();
    const images = await db.runTransaction(async transaction => {
      const ref = db.collection('lessons').doc(id);
      const doc = await transaction.get(ref);
      if (!doc.exists) return null;
      transaction.delete(ref);
      return doc.data()!.images as string[];
    });
    if (!images) return Response.json({ error: 'Lesson not found.' }, { status: 404 });
    const paths = images.map(url => imagePath(url, process.env.CLOUDINARY_CLOUD_NAME!)).filter((p): p is string => p !== null);
    const results = await Promise.allSettled(paths.map(async path => {
      await deletePhoto(path);
      await db.collection('uploads').doc(path.slice(8)).delete();
    }));
    if (results.some(result => result.status === 'rejected')) {
      console.error('Notehub: lesson removed; some unused photos need Cloudinary cleanup.');
    }
    return Response.json({ success: true });
  } catch (error) { return failure(error); }
}
