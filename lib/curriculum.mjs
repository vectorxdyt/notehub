// Numbered upload destinations checked against the Math Medic AP Calculus portal.
// Reference: https://portal.mathmedic.com/lesson-plans/course/AP-Calculus
// These are organizational identifiers, not copies of Math Medic lesson materials.
const abUnits = [
  [1, 'Intro to calculus', 9],
  [2, 'Differentiation', 9],
  [3, 'Composite, implicit & inverse functions', 5],
  [4, 'Derivatives in context', 7],
  [5, 'Analyzing functions', 9],
  [6, 'Integration & accumulation', 12],
  [7, 'Differential equations', 5],
  [8, 'Applications of integration', 8],
];
export const calculusUnits = abUnits.map(([number, title, count]) => ({
  id: `unit-${number}`, number, title,
  sourceUrl: `https://portal.mathmedic.com/lesson-plans/course/AP-Calculus/unit/${number}`,
  lessons: Array.from({length: Number(count)}, (_, index) => {
    const code = `${number}.${index + 1}`;
    return {id: code, label: `Lesson ${code}`, code};
  }),
}));
calculusUnits.push({
  id: 'unit-9', number: 9, title: 'Selected BC topics',
  sourceUrl: 'https://portal.mathmedic.com/lesson-plans/course/AP-Calculus/unit/9',
  lessons: ['6.11','6.13','7.5','9.1','9.6','9.8','10.1, 10.2, 10.5','10.8','10.11','10.13'].map(code => ({
    id: `bc-${code.replaceAll(', ', '-')}`, label: `${code.includes(',') ? 'Topics' : 'Topic'} ${code} (BC)`, code,
  })),
});
export const curriculumLessons = calculusUnits.flatMap(unit => unit.lessons);
export const findCurriculumLesson = id => curriculumLessons.find(lesson => lesson.id === id);
export const isCurriculumLesson = id => typeof id === 'string' && curriculumLessons.some(lesson => lesson.id === id);
