<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- User website code lives in `src/site/`, admin panel code in `src/admin/`; they never import each other, only `src/shared/`. Why: user asked for two fully separate apps.
- Routes in `src/routes/` stay thin and only render pages from `src/site/pages` or `src/admin/pages`. Why: keeps the two folder trees self-contained.
- All data comes from the existing external Upgrade Talents India REST backend via `src/shared/api.ts`; user and admin tokens are stored under separate localStorage keys. Why: backend already exists; no Lovable Cloud.
- Admin theme is applied by the `.admin-theme` class on the `/admin` layout, overriding the site's tokens. Why: one token set, two distinct looks.
- Theme preference is shared through `eventora_theme` and applied on the root document before render. Why: both separate experiences need synchronized light/dark mode without a flash.
- Public homepage sections use the shared CMS publication filter and the homepage response. Why: unpublished, hidden or disabled business content must not appear, and admin display order must be preserved.
- Platform identity lives in `src/shared/brand.ts`; visible branding reads `BRAND`/`brandName()` instead of hard-coding the name. Why: the platform was renamed and the backend may still publish the legacy brand in its site settings.

- Customer visual tokens and control refinements are scoped to `.site-theme`; admin overrides remain independent. Why: customer-only redesigns must not alter the operations console.
