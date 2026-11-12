import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonMatchesSearch} from '../lib/lessons.ts';

const lesson = {
  id:'lesson-1',
  title:'A first look at derivatives',
  topic:'Calculus',
  curriculumLesson:'2.2',
  date:'2026-11-06',
  description:'Slope at a point.',
  keyIdeas:'Connect average rate of change to the tangent line.',
  keyIdeasSource:'teacher',
  images:['/board.jpg'],
};

test('lesson search includes teacher-authored key ideas', () => {
  assert.equal(lessonMatchesSearch(lesson,'tangent'),true);
  assert.equal(lessonMatchesSearch(lesson,'DERIVATIVES'),true);
  assert.equal(lessonMatchesSearch(lesson,'lesson 2.2','Lesson 2.2 · The Derivative'),true);
  assert.equal(lessonMatchesSearch(lesson,'integral'),false);
  assert.equal(lessonMatchesSearch(lesson,'   '),true);
});

test('lesson search supports existing lessons without key ideas', () => {
  const {keyIdeas,keyIdeasSource,...existingLesson}=lesson;
  assert.equal(lessonMatchesSearch(existingLesson,'slope'),true);
  assert.equal(lessonMatchesSearch(existingLesson,'tangent'),false);
});
