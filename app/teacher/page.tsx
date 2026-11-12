import {configured, teacher} from '@/lib/server';
import TeacherPortal from './teacher-portal';

// This route must evaluate the HttpOnly teacher session for every request.
export const dynamic = 'force-dynamic';

export default async function TeacherPage() {
  const user = await teacher();
  return <TeacherPortal authenticated={Boolean(user)} configured={configured()} email={user?.email || ''}/>;
}
