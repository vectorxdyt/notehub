import {getAccessPolicy, setAccessPolicy} from '@/lib/access';
import {validateAccessPolicy} from '@/lib/access-policy';
import {failure, sameOrigin, teacher} from '@/lib/server';

export const runtime = 'nodejs';

export async function GET() {
  const user = await teacher();
  if (!user) return Response.json({error: 'Please sign in as the teacher.'}, {status: 401});
  try {
    return Response.json(await getAccessPolicy(), {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({error: 'Request not allowed.'}, {status: 403});
  const user = await teacher();
  if (!user) return Response.json({error: 'Please sign in as the teacher.'}, {status: 401});
  if (Number(req.headers.get('content-length')) > 100_000) return Response.json({error: 'The approved student list is too large.'}, {status: 413});
  let body;
  try { body = await req.json(); } catch { return Response.json({error: 'Invalid access settings.'}, {status: 400}); }
  const policy = validateAccessPolicy(body);
  if (!policy) return Response.json({error: 'Use valid student email addresses and keep the list under 500 students.'}, {status: 400});
  try {
    await setAccessPolicy(policy, user.uid);
    return Response.json(policy, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}
