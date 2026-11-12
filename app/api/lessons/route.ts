import { randomUUID } from 'node:crypto';
import { firestore } from '@/lib/firebase-admin';
import { canAttachUpload, imagePath, sanitizeKeyIdeas, validLesson } from '@/lib/security';
import { configured, failure, sameOrigin, teacher, viewerAccess } from '@/lib/server';
import {notifySubscribers} from '@/lib/notifications';

export const runtime = 'nodejs';
export async function GET() {
  if (!configured()) return Response.json({ demo: true, lessons: [] });
  try {
    const access = await viewerAccess();
    if (!access.authorized) return Response.json({error: 'Sign in with an approved student account to view these notes.', restricted: true}, {status: 401, headers: {'Cache-Control': 'no-store'}});
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    // Sort in memory to avoid requiring a composite Firestore index for this small classroom archive.
    const snapshot = await firestore().collection('lessons').get();
    const lessons = snapshot.docs.map(doc => {
      const data = doc.data();
      const images = Array.isArray(data.images) ? data.images.map(url => imagePath(url, cloudName)).filter((path): path is string => path !== null).map(path => `/api/photos/${path.slice(8)}`) : [];
      return { id: doc.id, title: data.title, topic: data.topic, curriculumLesson: data.curriculumLesson ?? null, date: data.date, description: data.description, keyIdeas: data.keyIdeas ?? '', keyIdeasSource: data.keyIdeasSource ?? null, images, created_at: data.created_at };
    }).sort((a, b) =>
      String(b.date ?? '').localeCompare(String(a.date ?? '')) ||
      String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    );
    return Response.json({ demo: false, lessons }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  const user = await teacher();
  if (!user) return Response.json({ error: 'Please sign in as the teacher.' }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid lesson.' }, { status: 400 }); }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  if (!validLesson(body, cloudName)) return Response.json({ error: 'Choose a calculus lesson, add a title and valid date, keep key ideas under 1,500 characters, and upload 1–8 different photos.' }, { status: 400 });
  try {
    const db = firestore();
    const id = randomUUID();
    const keyIdeas = sanitizeKeyIdeas(body.keyIdeas)!;
    const lesson = { title: body.title.trim(), topic: 'Calculus', curriculumLesson: body.curriculumLesson, date: body.date, description: body.description.trim(), keyIdeas, keyIdeasSource: keyIdeas ? 'teacher' : null, images: body.images, created_at: new Date().toISOString() };
    const attached = await db.runTransaction(async transaction => {
      const refs = body.images.map(url => db.collection('uploads').doc(imagePath(url, cloudName)!.slice(8)));
      const uploads = await transaction.getAll(...refs);
      if (uploads.some((doc, index) => !canAttachUpload(doc.data(), user.uid, body.images[index]))) return false;
      transaction.create(db.collection('lessons').doc(id), { ...lesson, teacher_uid: user.uid });
      for (const ref of refs) transaction.update(ref, { lessonId: id });
      return true;
    });
    if (!attached) return Response.json({ error: 'These photos are missing, belong to another account, or were already published. Please upload them again.' }, { status: 400 });
    try { await notifySubscribers({id, title: lesson.title, curriculumLesson: lesson.curriculumLesson}); }
    catch (notificationError) { console.error('Notehub notifications could not be sent:', (notificationError as {code?: string}).code || 'unknown'); }
    return Response.json({ id, ...lesson, images: lesson.images.map(url => `/api/photos/${imagePath(url, cloudName)!.slice(8)}`) }, { status: 201 });
  } catch (error) { return failure(error); }
}
