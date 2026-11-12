import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonNarrationText} from '../lib/accessibility.ts';
import {localeFromStorage, translate} from '../lib/i18n.ts';

test('Spanish interface copy interpolates labels without translating lesson content', () => {
  assert.equal(translate('es', 'addNotes'), 'Agregar apuntes');
  assert.equal(translate('es', 'openLesson', {title: 'The Fundamental Theorem'}), 'Abrir The Fundamental Theorem');
  assert.equal(translate('en', 'openLesson', {title: 'The Fundamental Theorem'}), 'Open The Fundamental Theorem');
});

test('stored language preferences only accept supported locales', () => {
  assert.equal(localeFromStorage('es'), 'es');
  assert.equal(localeFromStorage('en'), 'en');
  assert.equal(localeFromStorage('fr'), 'en');
  assert.equal(localeFromStorage(null), 'en');
});

test('narration preserves teacher-authored lesson text and skips missing fields', () => {
  assert.equal(lessonNarrationText({id:'1',title:'Limits',topic:'Calculus',date:'2026-11-10',description:'Approach from both sides.',keyIdeas:'Check one-sided limits.',images:['/board.jpg']}), 'Limits. Check one-sided limits. Approach from both sides');
  assert.equal(lessonNarrationText({id:'2',title:'Derivatives',topic:'Calculus',date:'2026-11-10',description:'',images:['/board.jpg']}), 'Derivatives');
});
