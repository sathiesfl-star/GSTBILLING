# Google OAuth setup (free) — "Sign in with Google" for BillEasy

The code is already built. Google sign-in stays **hidden** until you add credentials,
so the app works fine without it. To enable it:

## 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com → top bar → **Select a project → New Project** → name it "BillEasy" → Create.

## 2. Configure the OAuth consent screen
1. Left menu → **APIs & Services → OAuth consent screen**.
2. User type: **External** → Create.
3. Fill App name ("BillEasy"), user support email, developer email → Save and continue.
4. Scopes: leave default (email, profile, openid) → Save.
5. Test users: add your own Gmail (while the app is in "Testing" mode only test users can sign in) → Save.

## 3. Create the OAuth client ID
1. Left menu → **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins** — add both:
   - `http://localhost:3000`
   - `https://gstbilling-omega.vercel.app`  (your prod URL)
4. **Authorized redirect URIs** — add both (note the exact path):
   - `http://localhost:3000/api/auth/callback/google`
   - `https://gstbilling-omega.vercel.app/api/auth/callback/google`
5. Create → copy the **Client ID** and **Client secret**.

## 4. Add the credentials
**Local** (`.env.local`):
```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_ENABLED=true
```
**Vercel** (Settings → Environment Variables): add the same three, then **redeploy**.

## 5. Done
- The login/register pages now show **"Continue with Google."**
- First Google sign-in creates the user, then sends them to **/onboarding** to enter their
  business name + GSTIN (Google doesn't provide those). After that they reach the dashboard.
- Existing email accounts with the same Gmail are linked automatically.

## Going to production (remove the test-user limit)
While the consent screen is in **Testing**, only the test users you listed can sign in.
To open it to everyone: OAuth consent screen → **Publish app**. For just email/profile scopes,
Google does not require the full verification review.

## Notes
- The redirect URI path must be exactly `/api/auth/callback/google` — a mismatch is the #1 error ("redirect_uri_mismatch").
- `allowDangerousEmailAccountLinking` is on so a user who signed up with email/password can later use Google with the same address. This is safe here because Google verifies email ownership.
