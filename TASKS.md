# IT Resource Zone Resource Hub Implementation Tasks

This file tracks the production-grade resource CMS and learning hub work from start to finish. Mark tasks complete only after the app builds and the feature has been checked.

## Phase 0 - Product and Safety Decisions

- [x] Use a CMS-style architecture so resources can be managed from admin without code edits.
- [x] Keep categories as database records, not hardcoded constants.
- [x] Support multiple resource types: YouTube, PDF link, PDF upload, external link, image/file.
- [x] Store YouTube metadata snapshots in MongoDB instead of calling YouTube on every public page load.
- [x] Deduplicate uploaded files by SHA-256 hash before creating new ImageKit assets.
- [x] Keep resource progress separate from resource content.
- [x] Preserve existing exam/admin architecture and avoid touching unrelated worktree changes.

## Phase 1 - Data Foundation

- [x] Add `ResourceCategory` model with slug, order, publish state, icon/color, and resource counters.
- [x] Add `Resource` model with category reference, type, metadata, YouTube fields, asset fields, ordering, publish state, and indexes.
- [x] Add `UploadedAsset` model for ImageKit file deduplication and reference counting.
- [x] Add `ResourceProgress` model for continue-learning state.
- [x] Add Zod validation schemas for categories, resources, reorder payloads, YouTube preview/import, ImageKit auth, asset registration, and progress updates.
- [x] Add reusable helpers for slugs, YouTube URL parsing, YouTube API metadata fetches, ISO-8601 duration parsing, ImageKit upload auth, and serialization.

## Phase 2 - Public APIs

- [x] Add public category listing API.
- [x] Add public resource listing API with category/type/search filters.
- [x] Add signed-in resource progress GET/POST API.
- [ ] Add public resource detail API if standalone viewer pages need server-side data.
- [ ] Add cache tuning after real traffic patterns are visible.

## Phase 3 - Admin CMS APIs

- [x] Add admin category create/list/update/delete endpoints.
- [x] Add admin category reorder endpoint.
- [x] Add admin resource create/list/update/delete endpoints.
- [x] Add admin resource reorder endpoint.
- [x] Add YouTube single-video preview endpoint.
- [x] Add YouTube playlist preview endpoint with safe import limits.
- [x] Add playlist import endpoint that saves selected videos in order and skips duplicates.
- [x] Add ImageKit upload authentication endpoint.
- [x] Add uploaded asset registration endpoint with hash deduplication.
- [ ] Add ImageKit delete endpoint guarded by reference count.
- [ ] Add admin audit log entries for every resource/category mutation.
- [ ] Add persistent import job queue for very large playlists.

## Phase 4 - Admin UI

- [x] Add Resources entry to admin dashboard.
- [x] Add admin resource/category management page.
- [x] Add category create/edit/delete controls.
- [x] Add resource create/edit/delete controls.
- [x] Add category selector and quick category creation flow.
- [x] Add YouTube URL preview flow.
- [x] Add playlist preview/import flow.
- [x] Add order controls for categories and resources.
- [ ] Add drag-and-drop reorder after the simpler controls are stable.
- [x] Add ImageKit browser upload UI using the auth endpoint.
- [ ] Add asset library picker so existing uploads can be reused manually.

## Phase 5 - Public UI

- [x] Replace placeholder `/resources` page with a searchable learning hub.
- [x] Add category grid with resource counts and beginner-friendly labels.
- [x] Add category detail route with tabs for videos, PDFs, links, and files.
- [x] Add Continue Learning section for signed-in users.
- [x] Add Start Here/featured resources section.
- [x] Add responsive resource cards for dark and light themes.
- [x] Add mobile bottom spacing and touch-friendly controls.
- [ ] Remove `/resources` noindex only after useful real content exists.

## Phase 6 - Viewer and Progress

- [x] Add YouTube resource viewer with IFrame Player API.
- [x] Save progress every 20-30 seconds with debouncing.
- [x] Mark video complete at 90-95% watched.
- [x] Add PDF/external resource open action.
- [x] Add external link open tracking.
- [ ] Add Continue/Next resource UX.

## Phase 7 - ImageKit File Uploads

- [x] Add frontend SHA-256 hash calculation before upload.
- [x] Check existing asset by hash before calling ImageKit.
- [x] Upload new PDF/image/file to ImageKit only when the hash does not exist.
- [x] Register successful ImageKit upload in `UploadedAsset`.
- [x] Store ImageKit `fileId`, URL, MIME type, size, folder, and original filename.
- [x] Reuse existing asset URLs for duplicate uploads.
- [ ] Delete remote ImageKit files only when no resources reference the asset.

## Phase 8 - Scale, Reliability, and Security

- [x] Protect every admin endpoint with `requireAdmin`.
- [x] Enforce same-origin checks on write endpoints.
- [x] Validate write payloads with Zod.
- [x] Add indexes for common resource/category/progress queries.
- [x] Add rate limiting to import/auth-style endpoints.
- [ ] Add structured audit logs for all admin mutations.
- [ ] Add pagination/infinite loading for large resource libraries.
- [ ] Add bulk CSV import/export for resources.
- [ ] Add observability around failed YouTube/ImageKit requests.
- [ ] Add tests for parsers, validators, and API helpers.

## Phase 9 - Verification

- [x] Run lint after the foundation/admin work.
- [ ] Run production build after the foundation/admin work. Skipped per user request.
- [ ] Manually test admin create/edit/delete/reorder in browser.
- [ ] Manually test YouTube preview and playlist import with a real API key.
- [ ] Manually test ImageKit upload auth and dedupe flow with real credentials.
- [ ] Manually test public mobile and desktop resource browsing after public UI lands.

## Required Environment Variables

```env
YOUTUBE_API_KEY=
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=
```

## Notes

- YouTube playlist imports should preview first, then save selected videos. This prevents deleted/private/unwanted playlist items from entering the library.
- ImageKit private keys must stay server-only. The frontend receives only short-lived upload auth parameters.
- Duplicate uploaded files are detected by file hash, not filename. Two files can share a name while having different content.
