import type {Lesson} from './lessons';

/** Text narration intentionally preserves teacher-authored content verbatim. */
export function lessonNarrationText(lesson: Lesson) {
  return [lesson.title, lesson.keyIdeas, lesson.description]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(value => value.trim().replace(/[.!?]+$/, ''))
    .join('. ');
}
