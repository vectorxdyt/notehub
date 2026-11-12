import 'server-only';
import {firestore} from './firebase-admin';
import {storedAccessPolicy, type AccessPolicy} from './access-policy';

const accessRef = () => firestore().collection('settings').doc('access');

export async function getAccessPolicy(): Promise<AccessPolicy> {
  const snapshot = await accessRef().get();
  return storedAccessPolicy(snapshot.data(), snapshot.exists);
}

export async function setAccessPolicy(policy: AccessPolicy, teacherUid: string) {
  await accessRef().set({
    ...policy,
    updated_at: new Date().toISOString(),
    updated_by: teacherUid,
  });
}
