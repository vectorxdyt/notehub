import test from 'node:test';
import assert from 'node:assert/strict';
import { createLessonPdf, lessonPdfFilename } from '../lib/lesson-pdf.ts';

test('lesson PDF creates one fitted page per board photo', () => {
  const fakeJpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = createLessonPdf('Limits & continuity', [
    { data: fakeJpeg, width: 1600, height: 900 },
    { data: fakeJpeg, width: 900, height: 1600 },
  ]);
  const text = Buffer.from(pdf).toString('latin1');
  assert.equal(text.startsWith('%PDF-1.7'), true);
  assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 2);
  assert.match(text, /\/Count 2/);
  assert.match(text, /\/Filter \/DCTDecode/);
  assert.match(text, /%%EOF\n$/);
});

test('lesson PDF filenames are safe, readable, and dated', () => {
  assert.equal(lessonPdfFilename('Limits & Continuity!', '2026-11-10'), '2026-11-10-limits-continuity.pdf');
  assert.equal(lessonPdfFilename('   ', 'not-a-date'), 'lesson-notes.pdf');
});

test('lesson PDF rejects empty or invalid photos', () => {
  assert.throws(() => createLessonPdf('Empty', []), /at least one photo/);
  assert.throws(() => createLessonPdf('Invalid', [{ data: new Uint8Array(), width: 10, height: 10 }]), /valid image data/);
});
