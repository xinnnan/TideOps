# AGENTS.md

## Role And Core Protocol

You are an expert software engineer maintaining continuity for the TideOps project.

Before starting any meaningful task:

1. Read this file first.
2. Review both `Lessons Learned` and `Current Scratchpad`.
3. Rewrite the current user request in your own words inside `Current Scratchpad`.
4. Break the task into atomic checkbox steps.
5. Execute the work.
6. Review the results before finishing.
7. Update `Lessons Learned` if you discovered a reusable pattern, fixed a mistake, or received a correction.
8. Update `Current Scratchpad` before ending the task so the next agent run has clean continuity.

After finishing any meaningful task:

1. Re-read this file.
2. Verify the scratchpad reflects the latest state.
3. Record any durable implementation detail, library-specific gotcha, or workflow correction in `Lessons Learned`.
4. Remove stale short-term notes that no longer matter.

## Lessons Learned

### Project Baseline

- Repo: `/Users/universe/Desktop/TideOps`
- Product: TideOps field service operations workspace
- Stack: Next.js `16.2.2`, React `19.2.4`, Tailwind CSS `4`, `@supabase/supabase-js` `2.101.1`, `jspdf` `4.2.1`
- Current app direction: real Supabase-backed product, not local mock or localStorage business data

### Product And Data Model

- Multi-company support must be configurable. Never hardcode company names such as PB Robotech or Droplet AI Services.
- Customer-facing delivery brand is determined at the project level, not globally per company.
- Each project can define:
  - `managing_company_id`
  - `customer_facing_company_id`
  - `is_shared`
  - shared companies through `project_company_shares`
- Core master data is: `companies`, `clients`, `sites`, `projects`, `profiles`, `project_assignments`

### Supabase And Security

- This repository is public. Do not commit secrets.
- Keep real runtime values only in `.env.local`, which is already ignored by git.
- Frontend only needs:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL` is currently optional in this codebase and is not required for password login to work.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` into frontend code, `.env.example`, README, or other committed files.
- Supabase bootstrap instructions live in `docs/supabase-setup.md`.
- Main schema and RLS source of truth is `supabase/migrations/20260404233000_init_mvp.sql`.
- Photo attachments for daily reports and incidents now also depend on `supabase/migrations/20260405165000_add_field_media.sql`.
- Item-level photo associations for daily reports and incidents also depend on `supabase/migrations/20260405173500_item_level_media.sql`.
- Verified on `2026-04-06`: `attachments_json` should not be treated as a required insert column for `daily_reports` or `incidents`. The app now stores per-item media in the item-level JSON columns and no longer hard-requires the legacy aggregate attachment column during insert. The storage bucket and policies from `20260405165000_add_field_media.sql` are still required for actual photo upload.
- Verified on `2026-04-06`: in the current Supabase storage schema, `storage.objects.owner_id` compares as `text`, so media policies must use `auth.uid()::text` rather than `auth.uid()` to avoid `operator does not exist: text = uuid`.
- RLS helper functions that read from RLS-protected tables such as `profiles`, `projects`, or `project_assignments` must be created as `security definer` with `set search_path = public`. Otherwise Supabase can hit recursive policy evaluation and return `500` for basic `select` queries.
- Keep comment lines in `.env.local` commented. A plain text line without `#` becomes an unparsed env line and should be cleaned up.
- On `2026-04-06`, `git push origin main` to `https://github.com/xinnnan/TideOps.git` succeeded again from this machine after the earlier GitHub access issue was resolved externally. If push failures return later, re-check which GitHub account the machine is using before changing repo config.

### Auth And Onboarding

- Login is real Supabase email/password auth.
- Password recovery now uses two public routes:
  - `/forgot-password` to send the reset email
  - `/reset-password` to set the new password after opening the email link
- In this browser-only public-repo setup, do not add direct admin password overwrite with privileged secrets. The safe pattern is:
  - managers can send a password reset email to a selected user
  - any signed-in user can change their own password from the in-app account area
- Auth redirects now expect:
  - confirmation emails to come back to `/login`
  - recovery emails to come back to `/reset-password`
- Supabase `Authentication -> URL Configuration` must allow the TideOps `/login` and `/reset-password` URLs for both local and production environments if email confirmation or password reset is enabled.
- `auth.users` should auto-create `public.profiles` rows through the migration trigger.
- Admin-side platform user creation now uses an isolated browser Supabase client with `persistSession: false` so creating another account does not replace the current admin session.
- The in-app "create platform user" flow still depends on Supabase email/password sign-up being allowed for the project. If sign-up is disabled or email confirmation is enforced, the app follows those project settings.
- The first auth user still needs manual bootstrap in Supabase:
  - create the first `companies` row
  - set that user's `role = operations_manager`
  - set that user's `home_company_id`
- Verified on `2026-04-05`: the trigger created the first `public.profiles` row correctly, but it defaulted to `service_engineer` with `home_company_id = null`, so manual promotion is still required before admin workflows and company-scoped actions will work.

### Frontend And UX

- Navigation selected state already required a contrast fix. Do not regress to white-on-white or black-on-black selected states.
- On the dark sidebar and bottom navigation, selected items should use a high-contrast active state. A white active pill with dark text is more reliable here than a pale mint background.
- Updated on `2026-04-05`: the selected navigation item should not use a full highlight pill. Keep the selected state lightweight and rely on the side indicator bar plus stronger text contrast.
- UI must support bilingual switching between English and Chinese.
- For SSR + bilingual UI, the first server render and first client render must share the same language snapshot. Persisted language preference should be restored through a stable external-store pattern instead of setting language state synchronously inside an effect.
- Avoid leaving demo-only copy in the product. Remove demo passwords, demo users, and mock wording once real data is in place.
- For controlled master data fields such as site timezone, prefer dropdowns over free-text input to reduce bad data entry.
- Existing master data should remain editable after creation. At minimum, companies need an edit path in Admin for name, legal name, support email, brand line, and primary color.
- Operations managers should retain engineer capabilities for field work such as attendance clock-in and report/incident entry.
- Daily report should stay lean: major tasks, blockers/risks if any, and next-day plan.
- For mobile-friendly field entry, prefer numbered list composers over large free-text blocks when the user is entering repeated short items.
- For daily reports and incidents, photos must be attached to individual numbered items, not only to the whole record.
- Do not rely only on `input type="file" capture="environment"` for mobile photo capture. For report/incident item photos, provide a real `getUserMedia` camera flow with file-input fallback because browser capture behavior is inconsistent.
- Safety briefing topics can be suggested from selected task types and hazards, but users should remain able to accept or override the generated text.
- Product-facing copy should focus on how teams use the app. Avoid leading with architecture or implementation details in the main UI unless the user is in an explicit setup/error state.
- Even setup and error states should stay user-facing when possible. Prefer guidance like "contact your administrator" or "choose the project again" over raw Supabase, migration, or env-var instructions inside the product UI.
- Admin should not remain a flat page. Use tabs to separate overview, users, hierarchy, project network, contacts, and audit.
- Admin must also expose an `Account` area that is available to all users, not only operations managers.
- For non-manager users, the admin route should collapse to the account/password area instead of showing a hard access-denied page.
- Admin tab state should persist in the URL query string so saves and workspace refreshes do not drop the user back onto the default tab.
- For master data, the primary editing view should follow the natural hierarchy: companies as an organization tree, and clients -> sites -> projects as a delivery tree.
- When the structure hierarchy grows, prefer one larger structure workspace with list/tree rows over many nested cards. The delivery tree should scale like a hierarchy panel, not like card-in-card layouts.
- Within the structure workspace, split organization and delivery into their own subtabs. For large delivery datasets, prefer a directory/detail pattern with search and one active client branch instead of rendering every client/site/project branch at once.
- For delivery at larger scale, prefer three-step hierarchy browsing: client directory -> site sublist -> selected site/project detail. This is easier to search and maintain than expanding all branches together.
- For large admin hierarchies, keep the explorer columns compact and action-oriented. Do not put large edit forms directly inside directory lists; use the left and middle columns for search and selection, and reserve the right panel for editable detail tabs.
- For editable admin trees, do not bind `<details open={defaultOpen}>` directly to a default prop. Keep open state in component state, or rerenders from auth refresh, tab switches, or language changes will collapse the active editor.
- Workspace boot loading and background workspace refresh are different states. Do not let background refreshes unmount the active workspace UI, or unsaved local editor state in Admin will be lost when Supabase auth refreshes on tab focus.
- User role is global, not per project. Project assignments should inherit the user's global role; do not expose a separate per-project role editor in the admin UI.
- In user management, project assignment labels should include client, site, and project so assignments remain understandable once many projects exist.
- Users should also be managed through a searchable directory/detail layout rather than an all-cards list, for the same scalability reasons as the delivery hierarchy.
- For scalable admin UX, mirror patterns across Delivery and Users. Reusing the same directory -> explorer -> detail mental model makes search, navigation, and training easier as datasets grow.
- When Delivery and Users both use a three-column admin workspace, render those columns inside one shared outer card with internal dividers instead of three sibling cards. This preserves width, reduces wasted whitespace, and makes long labels less likely to wrap awkwardly.
- Keep admin count pills, badges, and tab labels `whitespace-nowrap` so short status text does not break into stacked lines in narrow columns.
- In dense admin workspaces, avoid duplicating level controls. Do not keep one tab set in the middle column and a second tab set in the right detail pane for the same hierarchy.
- Keep responsibility split cleanly: left column locates the top-level record, middle column chooses the concrete child/action, and right column edits only the current selection.
- Avoid duplicate search scopes. If the middle column already searches child records such as assignments or sites/projects, the left directory search should stay focused on top-level records.
- Weekly/monthly summary views are now part of attendance and safety, so future changes should preserve both field entry and period-level review in the same page.
- Leave should stay inside the attendance experience. `/leave` should behave as a redirect into the attendance leave tab rather than acting like a separate workflow screen.
- Operations managers can also submit leave requests. Team-wide attendance summaries and team exception views should stay hidden from ordinary service engineers.
- Leave type is currently fixed to `unpaid` in the UI. Do not expose a leave-type dropdown again until PTO or other leave categories become a real configurable feature.
- PDF export for daily reports and incidents currently exports structured text plus item-level photo counts; inline photo embedding is not implemented yet.
- For daily reports and incidents, keep numbered-list entry strictly item-by-item. Do not reintroduce multi-line paste that automatically splits text into multiple numbered items.
- In report and incident numbered-list entry, keep the add action inside the list input area, near the current items. Do not move the add button back up into the section header row.
- In report and incident feeds, service engineers should only see and search their own records. Operations managers can see all records and should get filter controls such as reporter, project, site, and date.
- Verified on `2026-04-06`: `Report` and `Incident` already follow the intended role split, and `Attendance` also hides team summary views from engineers. `Safety` does not yet match that access model; its recent-record and summary sections still read from the full `safetyCheckins` list for all users, and safety PDF export is not implemented.
- In Next.js 16 app routes, avoid `useSearchParams()` directly in statically built pages unless you intentionally wrap the read in `Suspense`. For simple client-only notices on login-like pages, reading `window.location.search` after hydration is the simpler path.
- For auth/session effects in React 19, prefer `useEffectEvent` when the effect needs the latest async loader without creating dependency churn.
- For TideOps page chrome, avoid stacking multiple translucent shells on top of tinted or gradient canvases. A flat app background plus solid surface cards is more stable and prevents visible color banding across long forms and admin workspaces.
- Do not put decorative texture overlays such as `noise-panel` on the default shared `Card` component. Large cards and long admin workspaces make those overlays visible as horizontal page bands once the page scrolls.
- Keep shared shell shadows subtle. Large blur shadows on sticky sidebars or full-width workspace cards can read like background color shifts on long pages.

### Current Verified State

- `npm run lint` passed on `2026-04-06`
- `npm run build` passed on `2026-04-06`
- Local routes `/login` and `/today` returned HTTP `200` on `2026-04-05`
- Old dev servers on ports `3000` and `3001` were stopped and a fresh `npm run dev` instance was restarted on port `3000` on `2026-04-05`
- Verified on `2026-04-06`: `vercel` CLI is installed as `50.9.5`, but `vercel whoami` currently returns `No existing credentials found`, so deployment is blocked until the machine is authenticated to Vercel.
- Verified on `2026-04-06`: local `.env.local` already contains non-empty values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, so dashboard-based Vercel deployment can proceed once those same two values are added in Vercel Project Settings.

## Current Scratchpad

Task summary:

- Fix the current Supabase submit error for daily reports. The database on the user's side is missing `attachments_json`, so the app should stop requiring that legacy column on insert while still preserving item-level media support.

Checklist:

- [x] Re-read project continuity notes before the submit-error fix
- [x] Confirm whether `attachments_json` is still being written by report and incident submit flows
- [x] Remove the hard dependency on `attachments_json` from report and incident inserts
- [x] Run lint and build after the fix
- [ ] Tell the user which database migration is still required for real photo upload

Most likely next tasks:

- [ ] After Vercel auth is available, use `.env.local` as the source of truth for the two public env vars
- [ ] After the deploy finishes, test `/login` and `/reset-password` on the Vercel domain
- [ ] Add the Vercel production URL back into Supabase `Site URL` and redirect allow list
- [ ] If TideOps later needs more visual atmosphere, reintroduce it through one controlled background treatment instead of stacking multiple translucent overlays
- [ ] Keep tightening remaining admin copy so feature names stay clear without slipping back into implementation vocabulary

Scratchpad rules:

- On a new task, clear stale checklist items and rewrite the task summary in your own words.
- Keep steps atomic and update `[ ]` to `[x]` as work completes.
- If a milestone changes the plan, rewrite the remaining checklist instead of appending contradictory notes.
