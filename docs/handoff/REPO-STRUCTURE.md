# Repository structure: one source of truth

This doc fixes a common confusion: **Lovable pushes to GitHub**, but **your Mac may have extra folders next to the real repo**. Agents must align on **one** canonical tree.

## What “one folder” means on GitHub

- **GitHub repository:** `Delta0537/bluefin-crew-sync`
- The **root of that repo** is the app root: `package.json`, `src/`, `supabase/`, etc.
- There is **no** second GitHub repo required for the app, and you **do not** need a parent folder on GitHub. The repo itself is the single project folder.

If Lovable is connected to that repo on `main`, **all app code lives at the repo root** after clone.

## What you may have locally (example: Drew’s machine)

Cursor “BlueFin Schedule” workspace often looks like:

```text
/Users/.../BlueFin Schedule/          ← NOT a git repo (no .git here)
  PPC-HQ EOB ...xlsm                   ← reference spreadsheet (optional)
  bluefin-crew-sync/                   ← THE ONLY clone connected to GitHub (+ Lovable)
    .git
    package.json
    src/
    supabase/
    ...
  bluefin-crew-glass/                  ← seen on some machines: copy without .git — do NOT treat as canonical
```

### Canonical folder (single source of truth for code)

**Use only:**

```text
.../BlueFin Schedule/bluefin-crew-sync/
```

All `git` commands, `npm run dev`, commits, and pushes run **from this directory**.

### Non-canonical folder: `bluefin-crew-glass`

If present, it typically looks like an **old or duplicate export** (often **no `.git`**).

**Do not** use it for Lovable sync or pushes. Safe cleanup process:

1. Compare against `bluefin-crew-sync` (`diff -rq` on `src/` and `supabase/migrations/` if needed).
2. Confirm anything worth keeping is already committed in `bluefin-crew-sync`.
3. **Back up** `bluefin-crew-glass` somewhere (zip) if unsure.
4. **Delete** `bluefin-crew-glass` locally to avoid editing the wrong tree.

Agents: **do not merge “glass” into Git** without a human sign-off; document findings in `docs/handoff/README.md` first.

### EOB spreadsheet (.xlsm)

- May live in the **parent** workspace for convenience.
- **Not required** inside the git repo for the app to run.
- If you **do** commit it: prefer `docs/reference/` and team agreement (binary size, sensitivity). Otherwise keep it **local only** or use shared drive; mention location in `docs/handoff/README.md`.

## Recommended Cursor / IDE setup

To avoid path mistakes:

1. **File → Open Folder…** → select **`bluefin-crew-sync`** (the folder that contains `.git`).
2. Optional: add sibling folders in a **multi-root workspace** only if you need the EOB next to code; still run **git only** in `bluefin-crew-sync`.

## Commands (always from canonical repo)

```bash
cd "/Users/delta135/BlueFin Schedule/bluefin-crew-sync"
git status
git remote -v
```

Remote should show `https://github.com/Delta0537/bluefin-crew-sync.git` (or SSH equivalent).

## Rule for Cursor + Claude Code (while building)

Anyone changing code should:

1. Confirm `pwd` and presence of `.git` before editing (canonical tree only).
2. Note machine-specific layout in **`docs/handoff/README.md`** if it affects how others clone or open the project.
3. Never “merge GitHub folders” — **there is only one repo**; cleanup means **local duplicates** and **branch sync**, not two GitHub projects.
