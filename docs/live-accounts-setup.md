# Pulseboard - Live accounts setup (Meta + LinkedIn)

Use this before hosting to connect **real** Instagram, Facebook, and LinkedIn accounts.

Fixtures stay the default for demo/CI. Live mode is opt-in via `.env`.

**Demo login (local):** `demo@pulseboard.local` / `pulseboard-demo` → http://localhost:3000/login

---

## What live mode can do

| Platform | Connect (OAuth) | Sync / analytics | Publish |
|---|---|---|---|
| Instagram | Yes | Yes (Graph reads) | Yes - **public image or video URL + caption** (Meta requires media) |
| Facebook Page | Yes | Yes | Yes - text post to the Page |
| LinkedIn | Yes | Limited (see below) | Yes - text post as you (member) |
| X | No API | N/A | Copy-only in `/x` |

---

## 1. Meta Developer app (Instagram + Facebook)

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App**.
2. Choose a type that supports **Facebook Login** + **Instagram** (Business often works).
3. Add products: **Facebook Login** and **Instagram** (Graph API / Instagram API with Instagram Login or classic IG Graph via Page - Pulseboard uses Page-linked IG Business/Creator).
4. **App settings → Basic:** copy **App ID** and **App Secret** into `.env` as `META_APP_ID` / `META_APP_SECRET`.
5. **Facebook Login → Settings → Valid OAuth Redirect URIs** (exact):
   - `http://localhost:3000/api/oauth/instagram/callback`
   - `http://localhost:3000/api/oauth/facebook/callback`
6. Keep the app in **Development** mode. Add your Facebook user under **Roles → Roles / Testers**.
7. Instagram account must be **Business or Creator** and linked to a **Facebook Page** you admin.
8. In `.env`:
   ```env
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback
   META_FB_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback
   META_USE_FIXTURES=false
   APP_URL=http://localhost:3000
   COOKIE_SECURE=false
   ```
9. After changing scopes in code, **Disconnect** then **Connect** again in Settings so Meta re-consents publish permissions.

Permissions Pulseboard requests (dev mode: your tester account only):

- Instagram: `instagram_basic`, `instagram_manage_insights`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`
- Facebook: `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_posts`, `read_insights`, `business_management`

**App Review** is only needed to let other people (non-testers) use the app. For your own testing, Development mode is enough.

### Instagram media for live publish

Create a draft with:

- Caption (body)
- **Media URL** - a publicly reachable `https://…` image (jpg/png) or video URL

Meta will not publish caption-only feed posts via the Content Publishing API.

---

## 2. LinkedIn Developer app

1. Go to [linkedin.com/developers](https://www.linkedin.com/developers/) → **Create app**.
2. Fill company / privacy URLs as required.
3. **Auth → Redirect URLs:** `http://localhost:3000/api/oauth/linkedin/callback`
4. Request / enable products that grant **Sign In with LinkedIn** (OpenID) and **Share on LinkedIn** / member post (`w_member_social`). Exact product names change in LinkedIn’s UI - you need a token that can create a member UGC post.
5. Copy **Client ID** and **Client Secret** into `.env`:
   ```env
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   LINKEDIN_REDIRECT_URI=http://localhost:3000/api/oauth/linkedin/callback
   LINKEDIN_USE_FIXTURES=false
   ```
6. Disconnect/reconnect LinkedIn in Settings after enabling scopes.

Scopes Pulseboard requests: `openid`, `profile`, `email`, `w_member_social`.

### LinkedIn sync honesty

Live LinkedIn **publish** is wired. Live **posts/analytics sync** depends on LinkedIn product access (Community Management / marketing APIs). If your app lacks those products, Sync may connect successfully but show few or no historical posts - that is expected, not a fake chart.

---

## 3. Optional: live Gemini

```env
GEMINI_API_KEY=...
GEMINI_USE_FIXTURES=false
```

---

## 4. Run the app for live testing

### Option A - `npm run dev` (simplest)

1. `docker compose up -d postgres`
2. Fill `.env` as above (fixtures `false` + credentials)
3. `npx prisma migrate deploy` && `npm run db:seed` (if needed)
4. `npm run dev` → http://localhost:3000

### Option B - full Docker

Compose defaults fixtures to **true** but allows override from host `.env`. Pass Meta/LinkedIn keys in `.env`, set `*_USE_FIXTURES=false`, then:

```bash
docker compose up -d --build --force-recreate app
```

Keep `COOKIE_SECURE=false` and `APP_URL=http://localhost:3000` for local HTTP.

---

## 5. Human test checklist

1. Login → **Settings** → Connect Instagram (real Meta dialog) → Sync → Overview/analytics show data  
2. Connect Facebook → Sync → Page cards  
3. Connect LinkedIn → profile connected; publish works even if sync is sparse  
4. **Create** → Facebook or LinkedIn → text → Publish now → post appears on the network  
5. **Create** → Instagram → caption + **public media URL** → Publish → appears on IG  
6. Approvals / schedule still work; failed live publish shows an **error** flash (not a fake success)  
7. `/settings/health` shows live (not fixture) when flags are false  

When this feels good, you are ready to discuss **hosting** (HTTPS, `COOKIE_SECURE=true`, real redirect URIs, App Review).
