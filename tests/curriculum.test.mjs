import test from 'node:test';
import assert from 'node:assert/strict';
import {calculusUnits,curriculumLessons,findCurriculumLesson,isCurriculumLesson} from '../lib/curriculum.mjs';
test('the numbered calculus destinations cover the observed portal units without collisions',()=>{
 assert.deepEqual(calculusUnits.map(unit=>unit.lessons.length),[9,9,5,7,9,12,5,8,10]);
 assert.equal(curriculumLessons.length,74);
 assert.equal(new Set(curriculumLessons.map(lesson=>lesson.id)).size,74);
 assert.equal(findCurriculumLesson('6.10').label,'Lesson 6.10');
 assert.equal(findCurriculumLesson('6.1').label,'Lesson 6.1');
 assert.notEqual(findCurriculumLesson('6.11').id,findCurriculumLesson('bc-6.11').id);
 assert.equal(findCurriculumLesson('bc-10.1-10.2-10.5').code,'10.1, 10.2, 10.5');
 for(const invalid of ['6.01','6.13','1.10','2.10','9.2',undefined,null])assert.equal(isCurriculumLesson(invalid),false);
});
