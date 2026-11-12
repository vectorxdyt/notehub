# notehub

A minimal math classroom photo archive for Vercel. **No-credit-card setup:** Firebase Spark handles Google teacher sign-in and lesson records; Cloudinary Free stores board photos. Students browse without accounts. Both free services have usage limits.

Follow **[SETUP_FIREBASE.md](./SETUP_FIREBASE.md)** to finish configuration. The Firebase project, Google provider, and Oregon Firestore database are already created. Cloudinary and Firebase server credentials are connected in this workspace’s private `.env.local`. Live service checks passed for Firestore read/write and Cloudinary upload/public delivery; temporary test data was removed. Complete Google sign-in in a regular browser and add environment settings to Vercel before production use. Do not upgrade Firebase to Blaze or enable Firebase Storage.

```sh
# Node.js 24
npm install
npm run dev
```

Open http://localhost:3000. Until all settings are present, the site shows labeled example lessons.

## Calculus lesson organization

The sidebar contains 64 numbered AB lessons and 10 BC topic entries, grouped by the [Math Medic AP Calculus portal](https://portal.mathmedic.com/lesson-plans/course/AP-Calculus). Click a destination such as Lesson 6.10, then Add notes. The upload form preselects it; students can browse notes by the same destination. These are organizational identifiers, not imported Math Medic materials. Continued days use the same numbered destination. Existing notes without a destination remain visible under Calculus.

## Access and uploads

- Only verified Google accounts in the server's comma-separated `TEACHER_EMAIL` list can publish/delete.
- Students read public notes and photographs without sign-in.
- Server routes check the five-day HttpOnly session and request Origin before every write.
- Authenticated Cloudinary uploads stay behind the teacher-protected server. A Firestore receipt records the uploader, image URL, and lesson attachment.
- Another teacher's uploads cannot be attached, and each photo can be published only once.
- Firestore browser access is denied by the supplied rules; the server uses Firebase Admin credentials.
- Bookmarks stay in each student's browser.
- Students can opt into browser notifications without an account. A notification opens the newly published lesson; expired browser subscriptions are removed automatically.

## Checks

```sh
npm test
npm run typecheck
npm run build
# After .env.local is complete:
npm run firebase:check
# With an unconfigured preview running:
node scripts/check-api.mjs
```

Live Google OAuth, publishing, image delivery, and deletion need a configured account round-trip; unit tests and a production build do not verify those integrations.

## Photos

JPG, PNG, and WebP files up to 25 MB are resized to a 2400 px maximum edge and compressed to JPEG under 3 MB. Uploads run sequentially within Vercel's request limits. Convert HEIC to JPG first. Original photos are not retained. Each lesson supports 1–8 photos.

Interrupted uploads can leave unused Cloudinary photos. The teacher can remove these through Cloudinary's dashboard. Deleting a lesson requests removal of its photographs and CDN invalidation; downloaded copies and caches may persist.

## Deployment

Import this folder's GitHub repository into Vercel using the Next.js preset. Add the 11 required variables from `.env.example` and the three optional Web Push variables to enable student notifications, then authorize your Vercel hostname in Firebase Authentication. The project ZIP excludes `.env.local` and private credentials. Remain within Vercel's free-plan limits and eligibility requirements.

`storage.rules` and `supabase.sql` are historical references and are not used or deployed. No Firebase Storage billing or Supabase credentials are needed. Previous versions' photos are not automatically migrated.

The included board diagrams are labeled examples. Interface fonts use Google Fonts with local fallbacks.
