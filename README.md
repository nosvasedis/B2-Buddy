<div align="center">

# B2 Buddy

**Your free, all-in-one companion for the B2 ECCE (Michigan) exam.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%26%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

</div>

B2 Buddy is a web app that helps students prepare for the **Michigan ECCE** (Examination for the Certificate of Proficiency in English) at B2 level. It covers all four skills—Speaking, Listening, Reading, and Writing—plus Grammar, Vocabulary, and exam-style drills, with a focus on **staying free**: smart use of free AI, local word lists, and browser APIs.

---

## Table of contents

- [Features](#features)
- [How it stays free](#how-it-stays-free)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Deploy to Firebase (beginner guide)](#deploy-to-firebase-beginner-guide)
- [Project structure](#project-structure)

---

## Screenshots

| Dashboard | Speaking | Listening | Dictionary Vault |
|-----------|----------|-----------|------------------|
| *Add a screenshot of the home hub* | *Add a screenshot of the speaking exam* | *Add a screenshot of a listening exercise* | *Add a screenshot of the word vault* |

*(Replace these placeholders with `![Description](path/to/image.png)` once you have screenshots.)*

---

## Features

### Home (Dashboard)

- **Personal study hub** with quest log and progress (XP, streak, level).
- **Word of the day** — one B1/B2 word per day, chosen from a large built-in list (no API call).
- **Coach brief** — short, motivating insight based on your stats (AI when available; fallback message if not).
- **Strategy tips** — rotating exam hacks for Speaking, Writing, Grammar, and Listening.
- **Quick navigation** to all sections.

### Speaking

- **Simulated B2 First–style speaking test** in four parts:
  - **Part 1** — Short interview (personal questions).
  - **Part 2** — Long turn: compare two photos (prompts from a fixed set; images via free Pollinations).
  - **Part 3** — Collaborative task with a pre-built mind map (topic + points).
  - **Part 4** — Discussion with follow-up questions.
- **Browser speech recognition** for your answers and **browser speech synthesis** for the examiner.
- **Pre-written examiner lines** so the mock test runs without per-turn AI.
- **One AI call at the end** for an evaluation report (strengths, band, feedback).

### Listening

- **Four exam-style listening modes:**
  - Part 1 — Short extracts, multiple choice.
  - Part 2 — Sentence completion (monologue).
  - Part 3 — Multiple matching (five speakers).
  - Part 4 — Long interview.
- **AI-generated scripts and questions** (one OpenRouter call per exercise).
- **Browser text-to-speech** to play the script (no paid TTS).
- **Transcript viewer** and answer checking with evidence highlighting.

### Reading

- **B2-level reading passages** (articles, stories, emails, reports) with **multiple-choice questions**.
- **AI-generated exercises** on a topic you choose.
- **Evidence-based answers** and performance insights.

### Writing (Essay Tutor)

- **Six writing types:** Opinion Essay, Review, Article, Report, Formal Email/Letter, Story.
- **Model essays** and **B2-level phrasing suggestions** (AI).
- **Image-based essay grading** (upload a photo of your essay for feedback and score).

### Dictionary Vault

- **Search** any word: **local B2 thesaurus first** (400+ headwords, no API), then **AI fallback** only if the word isn’t in the list.
- **Definitions, part of speech, CEFR level, synonyms, antonyms, examples, word family.**
- **Collect words** into your vault with XP and review scheduling.
- **Review quiz** on collected words (AI-generated questions when you run a quiz).

### Grammar & Vocabulary (Universal Tutor)

- **Grammar** and **Vocabulary** streams with B2-level lessons (theory + examples + MCQs).
- **AI-generated lessons** on the topic you pick; progress and completed topics saved.
- **Lesson cache** so revisiting a topic doesn’t re-call the API.

### Drills

- **Word formation, key word transformation, open cloze, multiple-choice cloze.**
- **AI-generated drill sets** and **answer validation** with brief explanations.

### Exam Mode

- **Timed, exam-style experience** combining multiple skills in one flow.

### Profile & Settings

- **Profile** — avatar, stats, learning profile, teacher report (AI-generated summary).
- **Settings** — theme (light/dark/auto), sound, notifications, target exam date, reset account.

---

## How it stays free

| Area | Approach |
|------|----------|
| **Daily word** | Large built-in B1/B2 list; date-based selection, zero API calls. |
| **Dictionary** | Local thesaurus (400+ words) first; OpenRouter only for words not in the list. |
| **Speaking** | Pre-written examiner lines and pre-built Part 2/3 content; one AI call for end-of-session evaluation. |
| **Listening** | One AI call per exercise (script + questions); playback via browser Speech Synthesis. |
| **AI provider** | [OpenRouter](https://openrouter.ai) with the **free** model router (`openrouter/free`). |

You only need a free OpenRouter API key; no paid model usage is required.

---

## Tech stack

- **Frontend:** React 18, TypeScript, Vite 5
- **Styling:** Tailwind CSS
- **Backend / Auth / DB:** Firebase (Auth, Firestore)
- **AI:** OpenRouter API (free models)
- **Images:** Pollinations.ai (free) for Speaking Part 2 photos

---

## Getting started

**Prerequisites:** Node.js (e.g. 18+).

1. **Clone and install**
   ```bash
   git clone https://github.com/your-username/b2-buddy.git
   cd b2-buddy
   npm install
   ```

2. **Environment**
   - Copy [.env.example](.env.example) to `.env.local`.
   - Set **OpenRouter**: get a key at [OpenRouter → Settings → Keys](https://openrouter.ai/settings/keys) and set `VITE_OPENROUTER_API_KEY=your_key_here`.
   - Set **Firebase**: in [Firebase Console](https://console.firebase.google.com/) → your project → Project settings (gear) → Your apps → copy the `firebaseConfig` values into your `.env.local` as the `VITE_FIREBASE_*` variables (see `.env.example`). To avoid "publicly accessible API key" warnings, [restrict the API key](https://console.cloud.google.com/apis/credentials) to your site (e.g. `https://b2-buddy.web.app/*`, `http://localhost:*`).

3. **Run**
   ```bash
   npm run dev
   ```
   Open the URL shown (e.g. `http://localhost:5173`).

---

## Deploy to Firebase (beginner guide)

Follow these steps **in order**. Copy and paste the commands into your terminal.

---

### What you need before starting

1. **Node.js** on your computer  
   - If you don’t have it: download from [nodejs.org](https://nodejs.org/) (LTS version) and install.  
   - Check: open a terminal and run `node -v`. You should see a version number.

2. **A Firebase project**  
   - The app is set up for a project named `b2-buddy`.  
   - If you already use that project (Auth/Firestore), you’re good.  
   - If not: go to [Firebase Console](https://console.firebase.google.com/) → **Add project** (or use an existing one) → remember the **Project ID**. If it’s not `b2-buddy`, you’ll change it in Step 7.

3. **An OpenRouter API key** (free)  
   - Go to [OpenRouter → Keys](https://openrouter.ai/settings/keys).  
   - Sign in (e.g. with Google).  
   - Click **Create Key**, name it (e.g. “B2 Buddy”), copy the key.  
   - Keep it somewhere safe; you’ll paste it in Step 8.

---

### Step 1: Open the project in a terminal

- **Windows:** Open **File Explorer** → go to the `B2-Buddy` folder → click the address bar, type `cmd` and press Enter (or right‑click → “Open in Terminal” if you have it).  
- **Mac:** Open **Terminal**, then run:
  ```bash
  cd path/to/B2-Buddy
  ```
  (Replace `path/to/B2-Buddy` with the real path to your project, e.g. `~/Downloads/B2-Buddy`.)

You should see your prompt with something like `B2-Buddy` in the path.

---

### Step 2: Install the app’s dependencies

Run:

```bash
npm install
```

Wait until it finishes (no red errors).

---

### Step 3: Install the Firebase CLI (one-time)

Run:

```bash
npm install -g firebase-tools
```

If you get a permission error on Mac/Linux, use:

```bash
sudo npm install -g firebase-tools
```
and enter your computer password.

---

### Step 4: Log in to Firebase

Run:

```bash
firebase login
```

A browser window will open. Log in with your Google account and allow Firebase. When it says “Success”, you can close the browser and go back to the terminal.

---

### Step 5: Tell Firebase which project to use

If your Firebase project ID is **exactly** `b2-buddy`, run:

```bash
firebase use b2-buddy
```

If you created a different project (e.g. `my-b2-buddy`), run:

```bash
firebase use YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with the ID you see in [Firebase Console](https://console.firebase.google.com/) (Project settings → Project ID).

---

### Step 6: Build the app with your OpenRouter key

The key must be set **in the same terminal session** where you run `npm run build`. Replace `your_actual_key_here` with the key you copied from OpenRouter.

**On Windows (Command Prompt or PowerShell):**

```bash
set VITE_OPENROUTER_API_KEY=your_actual_key_here
npm run build
```

**On Windows (PowerShell, if the line above doesn’t work):**

```powershell
$env:VITE_OPENROUTER_API_KEY="your_actual_key_here"; npm run build
```

**On Mac or Linux:**

```bash
export VITE_OPENROUTER_API_KEY=your_actual_key_here
npm run build
```

Wait until you see something like `✓ built in …`. If there are red errors, check that the key has no extra spaces or quotes (except in PowerShell where the quotes are required).

---

### Step 7: Deploy to Firebase Hosting

Run:

```bash
firebase deploy --only hosting
```

Wait until you see **Deploy complete**. The terminal will show a line like:

```
Hosting URL: https://b2-buddy.web.app
```
(or your project’s URL).

---

### Step 8: Open your app

Click that URL or paste it in your browser. Your B2 Buddy app is now live.

---

### Step 9: Share the site with your student

The URL from Step 7 (e.g. **https://b2-buddy.web.app**) is your live site. Send that link to your student. They can open it in any browser on their phone, tablet, or computer—no install needed. They’ll use the same app you see when you open the link.

---

## Auto-update when you push to GitHub

Once this is set up, **every time you push your code to GitHub, the live site will update automatically**. No need to run `npm run build` or `firebase deploy` by hand.

### One-time setup for auto-deploy

Do this **once** after you’ve deployed at least once (Steps 1–8 above).

1. **Get a Firebase “CI” token**  
   In your project folder, in the same terminal you use for the project, run:
   ```bash
   firebase login:ci
   ```
   A browser will open. Log in with the same Google account you use for Firebase. When it finishes, the terminal will print a **long token** (starts with something like `1//...`). **Copy the whole token** and keep it somewhere safe (you’ll paste it in GitHub in the next step).

2. **Push your project to GitHub**  
   If you haven’t already:
   - Create a new repository on [GitHub](https://github.com/new) (e.g. name: `B2-Buddy`).
   - In your project folder, run (replace with your repo URL):
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/B2-Buddy.git
     git add .
     git commit -m "Initial commit"
     git push -u origin main
     ```
   If your default branch is `master` instead of `main`, use `master` in the push and in the note below.

3. **Add two secrets to your GitHub repo**  
   - Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
   - Click **New repository secret** and add:
     - **Name:** `FIREBASE_TOKEN`  
       **Value:** paste the token you copied from step 1.
     - **Name:** `VITE_OPENROUTER_API_KEY`  
       **Value:** your OpenRouter API key (the same one you used in Step 6).  
       (This way the site that GitHub builds and deploys will have the key and AI features will work.)
   - Save both secrets.

4. **The workflow is already in the project**  
   The repo contains a file `.github/workflows/firebase-deploy.yml`. It runs on every **push to the `main` branch** (or `master` if you use that). It will:
   - Install dependencies
   - Build the app (using `VITE_OPENROUTER_API_KEY` from secrets)
   - Deploy to Firebase Hosting

5. **Trigger the first auto-deploy**  
   After adding the secrets, push any change (or an empty commit):
   ```bash
   git add .
   git commit -m "Enable auto-deploy"
   git push
   ```
   Then on GitHub go to **Actions**. You should see a run “Deploy to Firebase Hosting”. When it turns green, the live site has been updated.

From now on: **edit code → commit → push to `main`** and in a couple of minutes the site at https://b2-buddy.web.app (or your project URL) will show your changes. Your student will always see the latest version when they open the link.

---

### If something goes wrong

- **“firebase: command not found”**  
  Close the terminal, open a new one, go back to the project folder, and try the `firebase` command again. If it still fails, run `npm install -g firebase-tools` again.

- **“Project not found” or “Permission denied”**  
  Make sure you ran `firebase use YOUR_PROJECT_ID` with the correct project ID from Firebase Console, and that you’re logged in with the same Google account that owns that project.

- **Build fails**  
  Run `npm install` again, then set `VITE_OPENROUTER_API_KEY` and `npm run build` again. Don’t put a space before or after the `=` when setting the key (Windows: `set VITE_OPENROUTER_API_KEY=sk-or-...`).

- **App is live but AI features don’t work**  
  The key is baked in at **build** time. If you change the key or set it wrong, run Step 6 and Step 7 again (set key → build → deploy).

- **GitHub Action “Deploy to Firebase Hosting” fails**  
  Check that you added both secrets (`FIREBASE_TOKEN` and `VITE_OPENROUTER_API_KEY`) under **Settings → Secrets and variables → Actions**. If the token is wrong, run `firebase login:ci` again and update the `FIREBASE_TOKEN` secret.

---

## Project structure

```
b2-buddy/
├── .github/
│   └── workflows/
│       └── firebase-deploy.yml   # Auto-deploy to Firebase on push to main
├── src/
│   ├── components/     # React UI (Dashboard, SpeakingCoach, ListeningLounge, etc.)
│   ├── data/           # Static data (daily words, thesaurus, speaking prompts)
│   ├── services/       # API and helpers (OpenRouter, dictionary, auth, cache, sound)
│   ├── lib/            # Firebase config
│   └── types.ts        # Shared TypeScript types
├── firebase.json       # Hosting config (public: dist)
├── .firebaserc         # Firebase project alias
└── .env.example        # Example env (VITE_OPENROUTER_API_KEY)
```

---

## License

Private / unlicensed unless otherwise specified. Use and deploy for personal or educational purposes.

---

<div align="center">

**B2 Buddy** — one app, all four skills, built to stay free.

</div>
