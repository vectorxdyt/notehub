// Run against an unconfigured local preview. Never sends credentials or uploads files.
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
const session = await fetch(`${base}/api/auth`).then(r => r.json());
assert.equal(session.demo, true, 'Run this smoke check on the unconfigured preview only.');
assert.equal(session.teacher, false);
for (const [path, method] of [['/api/uploads','POST'],['/api/uploads','DELETE'],['/api/access','PUT'],['/api/lessons','POST'],['/api/lessons/11111111-1111-4111-8111-111111111111','DELETE']]) {
  const unauthenticated = await fetch(base + path, {method, headers:{Origin:base}});
  assert.equal(unauthenticated.status, 401, `${method} ${path} must require teacher access`);
  const forgedSession = await fetch(base + path, {method, headers:{Origin:base,Cookie:'notehub_firebase_session=forged'}});
  assert.equal(forgedSession.status, 401, `${method} ${path} must reject a forged session`);
  const otherSite = await fetch(base + path, {method, headers:{Origin:'https://other-site.example'}});
  assert.equal(otherSite.status, 403, `${method} ${path} must reject another Origin`);
}
for (const method of ['POST','DELETE']) {
  const response = await fetch(`${base}/api/auth`, {method, headers:{Origin:'https://other-site.example'}});
  assert.equal(response.status, 403, `${method} /api/auth must reject another Origin`);
}
console.log('Passed: anonymous/forged writes and cross-origin sign-in/sign-out are rejected.');
