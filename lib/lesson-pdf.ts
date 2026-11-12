import { Buffer } from 'node:buffer';

export type PdfPhoto = { data: Uint8Array; width: number; height: number };

const A4 = { short: 595.28, long: 841.89 };

function utf16Hex(value: string) {
  const littleEndian = Buffer.from(value, 'utf16le');
  for (let index = 0; index < littleEndian.length; index += 2) {
    [littleEndian[index], littleEndian[index + 1]] = [littleEndian[index + 1], littleEndian[index]];
  }
  return `FEFF${littleEndian.toString('hex').toUpperCase()}`;
}

function object(body: string | Buffer) {
  return Buffer.isBuffer(body) ? body : Buffer.from(body, 'ascii');
}

function stream(dictionary: string, contents: Uint8Array) {
  const bytes = Buffer.from(contents);
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`, 'ascii'),
    bytes,
    Buffer.from('\nendstream', 'ascii'),
  ]);
}

/** Builds a small, dependency-free PDF with one fitted board photo per page. */
export function createLessonPdf(title: string, photos: PdfPhoto[]): Uint8Array {
  if (!photos.length) throw new Error('A lesson PDF needs at least one photo.');
  if (photos.some(photo => !photo.data.length || photo.width <= 0 || photo.height <= 0)) {
    throw new Error('Lesson PDF photos need valid image data and dimensions.');
  }

  const objects: Buffer[] = [];
  const pageIds = photos.map((_, index) => 3 + index * 3);
  const infoId = 3 + photos.length * 3;
  objects[0] = object('<< /Type /Catalog /Pages 2 0 R >>');
  objects[1] = object(`<< /Type /Pages /Count ${photos.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);

  photos.forEach((photo, index) => {
    const pageId = pageIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const landscape = photo.width > photo.height;
    const pageWidth = landscape ? A4.long : A4.short;
    const pageHeight = landscape ? A4.short : A4.long;
    const margin = 18;
    const scale = Math.min((pageWidth - margin * 2) / photo.width, (pageHeight - margin * 2) / photo.height);
    const imageWidth = photo.width * scale;
    const imageHeight = photo.height * scale;
    const x = (pageWidth - imageWidth) / 2;
    const y = (pageHeight - imageHeight) / 2;
    const drawing = `q\n${imageWidth.toFixed(3)} 0 0 ${imageHeight.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm\n/BoardPhoto Do\nQ\n`;

    objects[pageId - 1] = object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /BoardPhoto ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects[imageId - 1] = stream(`/Type /XObject /Subtype /Image /Width ${photo.width} /Height ${photo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, photo.data);
    objects[contentId - 1] = stream('', Buffer.from(drawing, 'ascii'));
  });

  objects[infoId - 1] = object(`<< /Title <${utf16Hex(title)}> /Author <${utf16Hex('Notehub')}> /Creator <${utf16Hex('Notehub')}> >>`);

  const header = Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'binary');
  const chunks: Buffer[] = [header];
  const offsets = [0];
  let offset = header.length;
  objects.forEach((body, index) => {
    offsets.push(offset);
    const wrapped = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, 'ascii'),
      body,
      Buffer.from('\nendobj\n', 'ascii'),
    ]);
    chunks.push(wrapped);
    offset += wrapped.length;
  });
  const xrefOffset = offset;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map(value => `${String(value).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join('');
  chunks.push(Buffer.from(xref, 'ascii'));
  return Buffer.concat(chunks);
}

export function lessonPdfFilename(title: string, date: string) {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'lesson-notes';
  return `${/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}-` : ''}${slug}.pdf`;
}
