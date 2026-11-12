import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedStudent, approvedViewerEmail, normalizeStudentEmail, storedAccessPolicy, validateAccessPolicy} from '../lib/access-policy.ts';

const googleStudent = {email:'Student@School.edu',email_verified:true,firebase:{sign_in_provider:'google.com'}};

test('a missing access policy preserves the existing public classroom behavior', () => {
  assert.deepEqual(storedAccessPolicy(undefined, false), {publicAccess:true,allowedEmails:[]});
});

test('a malformed stored policy fails closed and sanitizes its email list', () => {
  assert.deepEqual(storedAccessPolicy({allowedEmails:[' Valid@School.edu ','invalid','valid@school.edu']}, true), {publicAccess:false,allowedEmails:['valid@school.edu']});
  assert.deepEqual(storedAccessPolicy({publicAccess:true,allowedEmails:[]}, true), {publicAccess:true,allowedEmails:[]});
});

test('teacher access settings normalize, deduplicate, and validate student emails', () => {
  assert.deepEqual(validateAccessPolicy({publicAccess:false,allowedEmails:[' B@school.edu','a@school.edu','b@school.edu']}), {publicAccess:false,allowedEmails:['a@school.edu','b@school.edu']});
  assert.equal(validateAccessPolicy({publicAccess:false,allowedEmails:['not-an-email']}), null);
  assert.equal(validateAccessPolicy({publicAccess:'false',allowedEmails:[]}), null);
  assert.equal(validateAccessPolicy({publicAccess:false,allowedEmails:Array(501).fill('student@school.edu')}), null);
  assert.equal(normalizeStudentEmail(' student+calc@school.edu '), 'student+calc@school.edu');
});

test('only verified Google accounts on the live allowlist receive student access', () => {
  const policy = {publicAccess:false,allowedEmails:['student@school.edu']};
  assert.equal(approvedStudent(googleStudent, policy), true);
  assert.equal(approvedStudent({...googleStudent,email_verified:false}, policy), false);
  assert.equal(approvedStudent({...googleStudent,firebase:{sign_in_provider:'password'}}, policy), false);
  assert.equal(approvedStudent({...googleStudent,email:'other@school.edu'}, policy), false);
});

test('notification access recognizes current students and configured teachers', () => {
  const policy = {publicAccess:false,allowedEmails:['student@school.edu']};
  assert.equal(approvedViewerEmail('student@school.edu', policy, 'teacher@school.edu'), true);
  assert.equal(approvedViewerEmail('TEACHER@school.edu', policy, 'teacher@school.edu'), true);
  assert.equal(approvedViewerEmail('former@school.edu', policy, 'teacher@school.edu'), false);
});
