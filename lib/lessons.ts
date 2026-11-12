export type Lesson={id:string;title:string;topic:string;date:string;description:string;keyIdeas?:string;keyIdeasSource?:'teacher'|'ai-draft'|null;images:string[];curriculumLesson?:string|null;created_at?:string};
export function lessonMatchesSearch(lesson:Lesson,query:string,curriculumLabel=''){
  const needle=query.trim().toLowerCase();
  if(!needle)return true;
  return `${lesson.title} ${curriculumLabel} ${lesson.description} ${lesson.keyIdeas??''}`.toLowerCase().includes(needle);
}
export const examples:Lesson[]=[
{id:'example-1',title:'A first look at derivatives',topic:'Calculus',curriculumLesson:'2.2',date:'2026-10-27',created_at:'2026-10-27T19:00:00Z',description:'From the slope of a line to the slope at a point. Example lesson — replace with your own board photos.',keyIdeas:'Connect average rate of change to instantaneous rate of change. Interpret the derivative as the slope of the tangent line at a point.',keyIdeasSource:'teacher',images:['/boards/derivatives.svg']}
];
