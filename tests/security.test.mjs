import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedTeacher, canAttachUpload, canDiscardUpload, imagePath, sanitizeKeyIdeas, validLesson } from '../lib/security.ts';

const teacher = 'teacher@school.edu';
const google = { email: teacher, email_verified: true, firebase: { sign_in_provider: 'google.com' } };
test('only the configured, verified Google teacher is authorized', () => {
  assert.equal(allowedTeacher(google, teacher), true);
  assert.equal(allowedTeacher({...google, email:'TEACHER@SCHOOL.EDU'}, ' teacher@school.edu '), true);
  assert.equal(allowedTeacher({...google, email:'student@school.edu'}, teacher), false);
  assert.equal(allowedTeacher({...google, email:'teacher@school.edu.attacker.test'}, teacher), false);
  assert.equal(allowedTeacher({...google, email_verified:false}, teacher), false);
  assert.equal(allowedTeacher({...google, firebase:{sign_in_provider:'password'}}, teacher), false);
  assert.equal(allowedTeacher({...google, firebase:{sign_in_provider:'custom'}}, teacher), false);
  assert.equal(allowedTeacher(google, undefined), false);
  assert.equal(allowedTeacher(google, ''), false);
  assert.equal(allowedTeacher({}, teacher), false);
});
test('a comma-separated allowlist grants both teachers and rejects other accounts', () => {
  const first = 'katkinson@dtechhs.org';
  const second = 'petr.jansa.the5@gmail.com';
  const list = ` ${first}, ${second.toUpperCase()}, ,`;
  for (const email of [first, second]) {
    assert.equal(allowedTeacher({...google, email}, list), true);
    assert.equal(allowedTeacher({...google, email, email_verified:false}, list), false);
    assert.equal(allowedTeacher({...google, email, firebase:{sign_in_provider:'password'}}, list), false);
  }
  for (const email of ['student@dtechhs.org', 'other@gmail.com', 'jansa.the5@gmail.com', `${second}.attacker.test`]) {
    assert.equal(allowedTeacher({...google, email}, list), false);
  }
  assert.equal(allowedTeacher(google, ' , , '), false);
});
const cloud = 'classroom';
const path = 'notehub/fc67a91a-a7b0-4ac4-8a5d-a9d7026e33b3';
const image = `https://res.cloudinary.com/${cloud}/image/upload/v1234567890/${path}.jpg`;
test('photo references must belong to this Cloudinary account and Notehub folder', () => {
  assert.equal(imagePath(image, cloud), path);
  for (const url of [
    image.replace('/classroom/', '/another-cloud/'),
    'https://example.com/board.jpg',
    image.replace('res.cloudinary.com', 'res.cloudinary.com.evil.test'),
    image.replace('notehub/', '../'),
    image.replace('notehub/', 'private/'),
    image + '?unexpected=true',
    image.replace('v1234567890/', 'w_500/v1234567890/'),
    image.replace('.jpg', '.svg'),
    image.replace('fc67', '%GG'),
    null,
  ]) assert.equal(imagePath(url, cloud), null);
});
test('only an unused server-recorded upload owned by the teacher can be published', () => {
  const receipt = {url:image,owner:'teacher-uid'};
  assert.equal(canAttachUpload(receipt,'teacher-uid',image),true);
  assert.equal(canAttachUpload(receipt,'different-teacher',image),false);
  assert.equal(canAttachUpload(receipt,'teacher-uid',image+'?modified'),false);
  assert.equal(canAttachUpload({...receipt,lessonId:'existing-lesson'},'teacher-uid',image),false);
  assert.equal(canAttachUpload({...receipt,cleanupPending:true},'teacher-uid',image),false);
  assert.equal(canAttachUpload(undefined,'teacher-uid',image),false);
});
test('only an unattached upload owned by the teacher can be discarded', () => {
  const receipt = {url:image,owner:'teacher-uid'};
  assert.equal(canDiscardUpload(receipt,'teacher-uid',image),true);
  assert.equal(canDiscardUpload(receipt,'different-teacher',image),false);
  assert.equal(canDiscardUpload(receipt,'teacher-uid',image+'?modified'),false);
  assert.equal(canDiscardUpload({...receipt,lessonId:'existing-lesson'},'teacher-uid',image),false);
  assert.equal(canDiscardUpload(undefined,'teacher-uid',image),false);
});
const lesson = {title:'Quadratic functions',topic:'Calculus',curriculumLesson:'6.10',date:'2026-11-03',description:'Vertex and roots.',keyIdeas:'Connect the vertex to minimum and maximum values.',images:[image]};
test('lesson input rejects invalid dates, external images, and oversized data', () => {
  assert.equal(validLesson(lesson, cloud), true);
  assert.equal(validLesson({...lesson,keyIdeas:undefined}, cloud), true);
  for (const change of [
    {curriculumLesson:'6.01'}, {curriculumLesson:'6.13'}, {curriculumLesson:'not-real'}, {curriculumLesson:undefined}, {topic:'Algebra'}, {title:' '}, {title:'x'.repeat(121)}, {topic:''}, {topic:'x'.repeat(41)},
    {date:'2026-02-30'}, {date:'tomorrow'}, {description:'x'.repeat(1001)}, {keyIdeas:'x'.repeat(1501)}, {keyIdeas:42},
    {images:[]}, {images:[image,image]}, {images:['https://example.com/a.jpg']},
    {images:Array(9).fill(image)}, {images:[42]},
  ]) assert.equal(validLesson({...lesson,...change}, cloud), false);
  assert.equal(validLesson(null, cloud), false);
});
test('key ideas remain backwards compatible and are sanitized as teacher-authored plain text', () => {
  assert.equal(sanitizeKeyIdeas(undefined), '');
  assert.equal(sanitizeKeyIdeas(null), '');
  assert.equal(sanitizeKeyIdeas('  Limits\r\n\u0000and continuity.  '), 'Limits\nand continuity.');
  assert.equal(sanitizeKeyIdeas('x'.repeat(1500))?.length, 1500);
  assert.equal(sanitizeKeyIdeas('x'.repeat(1501)), undefined);
  assert.equal(sanitizeKeyIdeas({text:'not plain text'}), undefined);
});
