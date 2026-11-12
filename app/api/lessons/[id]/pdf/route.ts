import sharp from 'sharp';
import { examples } from '@/lib/lessons';
import { firestore } from '@/lib/firebase-admin';
import { createLessonPdf, lessonPdfFilename, type PdfPhoto } from '@/lib/lesson-pdf';
import { imagePath, validId } from '@/lib/security';
import { configured, failure, viewerAccess } from '@/lib/server';

export const runtime = 'nodejs';

const MAX_PHOTO_BYTES = 4_000_000;

async function pdfPhoto(url: string): Promise<PdfPhoto> {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('Photo download failed.');
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error('Photo download returned invalid content.');
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_PHOTO_BYTES) throw new Error('Photo is too large for a PDF.');
  const input = Buffer.from(await response.arrayBuffer());
  if (!input.length || input.length > MAX_PHOTO_BYTES) throw new Error('Photo is too large for a PDF.');

  const metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  if (metadata.format === 'jpeg' && metadata.width && metadata.height && metadata.channels === 3 && !metadata.orientation) {
    return { data: input, width: metadata.width, height: metadata.height };
  }
  const converted = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer({ resolveWithObject: true });
  return { data: converted.data, width: converted.info.width, height: converted.info.height };
}

async function pdfPhotos(urls: string[]): Promise<PdfPhoto[]> {
  const photos: PdfPhoto[] = [];
  // Limit simultaneous image decoding so an eight-photo lesson cannot spike memory usage.
  for (let index = 0; index < urls.length; index += 2) {
    photos.push(...await Promise.all(urls.slice(index, index + 2).map(pdfPhoto)));
  }
  return photos;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    let lesson: { title: string; date: string; images: string[] } | undefined;
    if (!configured()) {
      const example = examples.find(item => item.id === id);
      if (example) lesson = example;
    } else {
      const access = await viewerAccess();
      if (!access.authorized) return Response.json({error: 'Sign in with an approved student account to download these notes.'}, {status: 401, headers: {'Cache-Control': 'no-store'}});
      if (!validId(id)) return Response.json({ error: 'Invalid lesson.' }, { status: 400 });
      const doc = await firestore().collection('lessons').doc(id).get();
      if (doc.exists) {
        const data = doc.data()!;
        lesson = { title: data.title, date: data.date, images: data.images };
      }
    }
    if (!lesson) return Response.json({ error: 'Lesson not found.' }, { status: 404 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
    const imageUrls = lesson.images.map(url => {
      if (!configured() && url.startsWith('/')) return new URL(url, req.url).toString();
      if (!imagePath(url, cloudName)) throw new Error('Lesson contains an invalid photo.');
      return url;
    });
    const photos = await pdfPhotos(imageUrls);
    const pdf = createLessonPdf(lesson.title, photos);
    const filename = lessonPdfFilename(lesson.title, lesson.date);
    return new Response(new Uint8Array(pdf).buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && /Photo|PDF|invalid photo/.test(error.message)) {
      console.error('Notehub PDF generation failed:', error.message);
      return Response.json({ error: 'Could not prepare this PDF. Please try again shortly.' }, { status: 502 });
    }
    return failure(error);
  }
}
