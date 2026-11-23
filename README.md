# Inspiration Board

Save notes and images, tag them, and find them again. Every user sees only their own board.
AI helps you along the way: it describes images, proofreads notes, makes images, and suggests tags.

Stack: Vite + React (JavaScript), Tailwind v4 + shadcn/ui, Supabase (auth, Postgres, storage, edge functions).

## Start here (class setup)

You need [Node.js](https://nodejs.org) 20 or newer and git.

1. **Get the code.** On GitHub, click **Use this template → Create a new repository**.
   You get your own copy. Then clone your copy:
   ```bash
   git clone https://github.com/YOUR-NAME/YOUR-REPO.git
   cd YOUR-REPO
   ```
2. **Install the packages.**
   ```bash
   npm install
   ```
3. **Add the keys.** Your teacher gives you two values in the class.
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and paste the values:
   ```
   VITE_SUPABASE_URL=https://....supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
4. **Start the app.**
   ```bash
   npm run dev
   ```
   Open <http://localhost:5173> and sign up.

That is all. The database, the AI function, and the AI keys are already in the
teacher's Supabase project. You do not install the Supabase CLI and you do not
need an OpenAI or FAL.AI key.

Git ignores `.env.local`, so your keys never go to GitHub. Keep it that way.

### No keys yet? Use mock mode

With no keys in `.env.local`, the app starts in **mock mode** by itself.
A "Mock mode" pill shows in the bottom-left corner.

- Click **Use demo account** on the login page (`demo@example.com` / `demo1234`).
- Or sign up with any email. There is no email confirmation in mock mode.
- Data is saved only in this browser: records in localStorage, images in IndexedDB.
- **Reset mock data** in the user menu deletes all mock users and data.
- The AI buttons are disabled, because there is no server.

When you add the keys and restart `npm run dev`, the app uses Supabase.

### Work with an AI agent

The project works with any coding agent (desktop app, terminal, or IDE).
Open the project folder in the agent and tell it what you want to change.
Good first prompt: *"Read README.md, then start the app and tell me how it is built."*

## Features

- Sign up, log in, sign out (email + password)
- Add a note, an image, or both; drag and drop upload
- Tags: type and press Enter, or pick an existing tag
- Board with filters (All / Images / Notes) and search (⌘K / Ctrl+K)
- Details view, edit, remove
- Account settings: avatar, name, new password. A new account shows its email
  until you set a name.

AI features (not in mock mode):

- **Image description**: a new image gets a description on save. The app opens
  the details page when the description is ready. "Regenerate description" writes a new one.
- **Proofread**: fixes Polish or English notes (the language is found automatically,
  nothing is translated). Works in the form and on the details page, with "Undo".
- **Generate**: makes an image from the note. The image is saved as `generated`.
- **Suggest tags**: adds tags from the note and the image description, with "Undo".
  It prefers tags you already use. In the form, a new image gets its description
  at this step, not at the save. On the details page, the button shows when the
  inspiration has no tags.

## Deploy to Vercel (later in the course)

This is a later step. Skip it until the class gets there. The app runs on your
computer without it, and nothing in the setup above needs Vercel.

1. Push your repo to GitHub.
2. In <https://vercel.com>, click **Add New → Project** and import the repo.
   Vercel finds Vite by itself (build `npm run build`, output `dist`).
3. Before the first deploy, open **Environment Variables** and add the same two
   values as in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**.

Good to know:

- Vite reads these variables at build time. After you change one in Vercel,
  **redeploy**, or the site keeps the old value.
- The repo already has a small `vercel.json`. It sends every path to `index.html`,
  so a page reload on `/i/...` or `/account` does not give a 404. It does nothing
  on your computer, and you do not need to change it.
- Both values are safe in the browser. Never add an OpenAI or FAL.AI key to
  Vercel or to a `VITE_` variable: Vite sends those to every visitor.

## How the AI works

All AI calls go through one Supabase Edge Function, `hyper-worker`
(`supabase/functions/hyper-worker/index.ts`). The API keys are secrets in
Supabase. The browser never sees them.

| Action | Provider | Model |
|---|---|---|
| Image description | OpenAI | `gpt-6-luna` |
| Proofread (PL / EN) | OpenAI | `gpt-6-luna` |
| Tag suggestions | OpenAI | `gpt-6-luna` |
| Image from note | FAL.AI | `openai/gpt-image-2.6/flare/text-to-image` |

The app calls the function from `src/lib/ai.js`. The function checks the user's
login, calls the provider, and writes one row per call to the `ai_requests` table.

Limits:

- Image generation takes some time (often 10–60 s). Edge functions on the free plan stop after 150 s.
- A generated image that you do not save is deleted when you replace it,
  remove it, or leave the form.

## Use your own Supabase project (optional)

You need this only if you want your own backend, for example after the course.
You need the [Supabase CLI](https://supabase.com/docs/guides/cli), an OpenAI key
(<https://platform.openai.com/api-keys>), and a FAL.AI key (<https://fal.ai/dashboard/keys>).

1. Create a project at <https://supabase.com/dashboard> (the free plan is fine).
2. Log in and link this folder to the project. Run `supabase login` in your own
   terminal, because it opens the browser.
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   ```
3. Create the tables, the security rules, and the storage buckets:
   ```bash
   supabase db push
   ```
4. Deploy the AI function:
   ```bash
   supabase functions deploy hyper-worker
   ```
5. Add the AI keys as secrets. Make the file `supabase/.env.secrets` (git ignores it):
   ```
   OPENAI_API_KEY=...
   FAL_KEY=...
   ```
   Then send it to Supabase:
   ```bash
   supabase secrets set --env-file supabase/.env.secrets
   ```
6. Put your project URL and publishable key in `.env.local`
   (*Project Settings → API*), and restart `npm run dev`.

Optional secrets: `OPENAI_MODEL` and `FAL_IMAGE_MODEL` change the models without a code change.

No CLI? Paste each file from `supabase/migrations/` into the *SQL Editor*, in order,
and paste the function code into *Edge Functions → Deploy a new function → Via Editor*
with the name `hyper-worker`. Then turn off **Verify JWT with legacy secret** for
the function, because it checks the login itself.

### Email confirmation

Supabase turns on "Confirm email" by default. For quick tests you can turn it off in
*Authentication → Sign In / Providers → Email → Confirm email*.
If you keep it on, add your site addresses (`http://localhost:5173` and your
Vercel address) in *Authentication → URL Configuration*, so the link opens the app.

### If something fails

- Errors show in a red toast with the reason (for example a missing secret).
- *Edge Functions → hyper-worker → Logs* shows the server logs.
- The `ai_requests` table has one row per AI call, with status and error.

## Data model

| Table | Purpose |
|---|---|
| `profiles` | Name and avatar path. Created by a trigger on sign up. |
| `inspirations` | Note and/or image path, plus the AI fields (description, image source, proofread). |
| `tags`, `inspiration_tags` | Per-user tags, unique by name (case-insensitive). |
| `ai_requests` | Log of AI calls. Users can read their own rows; only the edge function writes. |

Storage files go to `<user_id>/<uuid>.<ext>`. Policies allow access only to your own folder.
The app shows images with signed URLs.

## Project structure

```
src/
  lib/          supabase client, data API (api.js picks api.supabase.js or api.mock.js), ai.js
  lib/mock/     mock auth, localStorage data, IndexedDB images, demo seed
  context/      AuthContext (session + profile)
  components/   header, card, form, tag input, dropzone, shadcn ui/
  pages/        Auth, Home, Details, New, Edit, Account
  assets/       logo, icons, and images
supabase/
  config.toml                 Supabase CLI settings
  migrations/                 database changes, applied in order by `supabase db push`
  functions/hyper-worker/     the AI edge function
vercel.json     only for the Vercel deploy later: sends all paths to index.html
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app at <http://localhost:5173> |
| `npm run build` | Builds the app into `dist/` |
| `npm run preview` | Serves the built app |
| `npm run lint` | Checks the code with oxlint |
