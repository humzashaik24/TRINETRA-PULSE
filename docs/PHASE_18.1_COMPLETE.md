# PHASE 18.1 COMPLETE

## 1. Objective

Replace the Phase 17 dev-identity gateway with real **authentication** (JWT)
and **role-based access control (RBAC)** on the real `/api/v2` layer, and
surface the whole security model in the web app:

```
Login (JWT) -> RBAC hierarchy (admin / supervisor / investigator / auditor)
                -> protected /api/v2 surface (mutation + delete + assistant gates)
                -> users + auth audit trail (alembic + seed)
                -> sign-in page, AuthGate, profile, Security page,
                   role-filtered navigation, read-only auditor UI
```

**Do NOT start Phase 18.2** — no blockchain, no anomaly detection, no
autonomous agents, no Neo4j/Redis expansion. No Docker. Mock mode and the
Operation Meridian (inv-006) demo stay byte-for-byte functional.

## 2. Files created

**Backend**

- `apps/api/app/models/user.py` — `TimestamplessBase`-style `User` model
  (email unique index, bcrypt-hashed password, `UserRole` enum, `is_active`)
  and `AuthAuditEvent` model (user FK nullable on delete, action enum
  `login_success` / `login_failure` / `permission_denied`, optional `details`
  JSON, `created_at`).
- `apps/api/alembic/versions/c4d5e6f7a8b9_add_users_auth_audit.py` — additive
  revision creating `users` + `auth_audit_events` (the migration chain is now
  **4 revisions**, ending at `c4d5e6f7a8b9`).
- `apps/api/app/core/security.py` — `create_access_token` / `create_refresh_token` /
  `decode_token` (pyjwt, HS256), `verify_password` / `hash_password` (bcrypt),
  and a production startup default-secret guard for `JWT_SECRET_KEY` and
  `APP_SECRET_KEY`.
- `apps/api/app/services/security.py` — repository functions:
  `get_user_by_email`, `get_user_by_id`, `authenticate_user`,
  `record_audit_event`, `list_users`, `list_audit_events`, `create_user`,
  `update_user`, `check_is_active`.
- `apps/api/app/schemas/real/auth.py` — `LoginRequest`, `LoginResponse`
  (`access_token`, `token_type`, `user`), `UserRead`, `UserRoleRead`,
  `UserCreate`, `UserUpdate`, `AuthAuditEventRead`, `UserListResponse`,
  `AuditListResponse`.
- `apps/api/app/api/deps.py` — rewritten around the bearer token: `CurrentUserDep`,
  `CanMutateDep` (not the read-only auditor), `SupervisorDep` (rank >= supervisor,
  with incumbent protection for self-demotion/deactivation), plus the
  `permission_denied` audit recorder.
- `apps/api/app/api/routers/auth.py` — `POST /auth/login` (the only public v2
  endpoint; 401 with no account enumeration), `GET /auth/me`.
- `apps/api/app/api/routers/admin.py` — `GET /admin/users`, `POST /admin/users`,
  `PATCH /admin/users/{user_id}`, `GET /admin/audit` (role-gated; `refresh()`
  after flush for server-side timestamps).
- `apps/api/tests/auth_stubs.py` — `install_auth_stub(app, role=...)` for
  functional v2 suites.
- `apps/api/tests/test_auth_rbac.py` — **17 tests** (full RBAC matrix).

**Frontend**

- `apps/web/src/lib/auth/types.ts` — `UserRole`, `AuthUser`, `LoginResponse`,
  `StoredAuthSession`, `AUDITOR`, `USER_ROLE_RANK`, `roleAtLeast`.
- `apps/web/src/lib/auth/session.ts` — localStorage persistence
  (`trinetra.auth.session`) with window guards.
- `apps/web/src/lib/api/auth.ts` — `apiLogin` / `apiCurrentUser`.
- `apps/web/src/state/auth.store.ts` — zustand store (`hydrate` / `login` /
  `logout` / `canMutate` / `hasRole` / `currentUser`); mock-mode auto-demo that
  can **never** run in API mode.
- `apps/web/src/hooks/use-auth.ts` — `useCurrentUser`, `useCanMutate`,
  `useHasRole`, `useIsRole`.
- `apps/web/src/components/auth/auth-gate.tsx` — dashboard route guard.
- `apps/web/src/components/auth/auth-bootstrap.tsx` — app-wide `setOnUnauthorized`
  wiring.
- `apps/web/src/app/login/page.tsx` — sign-in page with demo credentials in
  mock mode.
- `apps/web/src/app/(dashboard)/security/page.tsx` — admin users table + auth
  audit trail with 403 denied states.
- Frontend tests: `src/lib/api/client.test.ts` (updated), `src/state/auth.store.test.ts`
  (5), `src/components/auth/auth-gate.test.tsx` (1), `src/app/login/login-page.test.tsx`
  (3).
- `docs/PHASE_18.1_COMPLETE.md` — this report.

## 3. Files modified

**Backend**

- `apps/api/app/api/app.py` — mounts the `auth` and `admin` routers.
- `apps/api/app/api/routers/__init__.py` — exports both.
- `apps/api/app/api/routers/{investigations,entities,findings,evidence,notes,datasets,assistant}.py`
  — every v2 mutation gated (`CanMutateDep` / `SupervisorDep` for investigation
  delete); assistant reads require `CurrentUserDep`.
- `apps/api/app/db/seed.py` — idempotent `_seed_demo_users`, `DEMO_USERS`,
  `DEMO_USER_LOGINS`, invoked before the early return so pre-18.1 databases
  gain users; `DEMO_USER_LOGINS` printed at seed time. **The v1 preset + demo
  universe data are untouched.**
- `apps/api/alembic/env.py` — migration import list includes `User` +
  `AuthAuditEvent`.
- All 8 functional v2 test suites wired through `tests/auth_stubs.py`.
- `apps/api/tests/test_production_config.py` — rewritten to the bearer contract
  (missing header / wrong scheme / garbage token / `X-User-Id` never trusted).
- `apps/api/app/api/routers/admin.py` fixed with `await session.refresh(target)`
  after flush (`MissingGreenlet` on server-side `created_at`/`updated_at`).
- `apps/api/tests/test_relationship_api.py` — indentation fix.

**Frontend**

- `apps/web/src/lib/api/client.ts` — removed `X-User-Id`; added
  `setAuthAccessToken` / `setOnUnauthorized` / `buildHeaders` (Bearer token,
  no `Content-Type` for FormData); 401 with a token fires the handler.
- `apps/web/src/components/navigation/rail-config.ts` — `RailItem.roles` /
  `RailItem.minRole` + `filterRailItemsByRole`; Security item gated to
  supervisor/admin/auditor.
- `apps/web/src/components/shell/command-rail.tsx` — role-filters both nav
  sections.
- `apps/web/src/app/layout.tsx` — `AuthBootstrap` wraps children.
- `apps/web/src/app/(dashboard)/layout.tsx` — `AuthGate` wraps `AppShell`.
- `apps/web/src/app/(dashboard)/profile/page.tsx` — real page (role badge,
  display name, identifier, sign out).
- `apps/web/src/app/(dashboard)/investigations/page.tsx` — New investigation
  only for mutators.
- `apps/web/src/app/(dashboard)/investigations/new/page.tsx` — read-only
  warning for auditor.
- `apps/web/src/components/data-intelligence/upload-zone.tsx` — disabled
  drop-zone for the auditor role.
- Docs/config: `.env.example` (×3), `render.yaml` (JWT comments), `README.md`,
  `docs/README.md` (Phase 18.1 (Current), 17.10 de-flagged), `docs/REAL_APPLICATION_ARCHITECTURE.md`
  (router table, dependencies, verification numbers), `docs/RENDER_DEPLOYMENT.md`
  (JWT table row, sign-in section + demo account table).

## 4. Files deleted

None. No tables deleted, no migrations removed, no functionality removed.
`verify_181.db` (local verification artifact) was removed after verification.

## 5. Authentication design

- **Token**: JWTs signed HS256 with `JWT_SECRET_KEY`, 30-minute access /
  7-day refresh expiry (configurable). Claims: `sub` = user id, `email`,
  `role`, `exp`. `decode_token` returns a roles-required payload; the role
  claim is validated against the live `UserRole` enum.
- **Login contract**: `POST /api/v2/auth/login` with `{email, password}`.
  Failures return a uniform **401** `unauthorized` (no account enumeration —
  tests assert unknown email and wrong password are indistinguishable). Success
  returns `{access_token, token_type: "bearer", user: UserRead}`.
- **Dependency graph**:
  `CurrentUserDep` (401 on missing/malformed/expired/garbage tokens,
  `X-User-Id` never read) → `CanMutateDep` (403 `forbidden` unless role !=
  auditor) → `SupervisorDep` (403 unless rank >= supervisor).
- **Defense in depth**: mocked/stubbed role choices cannot reach the backend —
  the authority is solely the decoded JWT against the seeded DB row; forged
  `role: "admin"` claims are rejected (403).

## 6. RBAC matrix (verified by `tests/test_auth_rbac.py`)

| Surface | Gate | investigator | supervisor | admin | auditor |
|---|---|---|---|---|---|
| `POST /auth/login`, `GET /auth/me` | public / CurrentUser | ✅ | ✅ | ✅ | ✅ |
| v2 reads (timeline/network/analytics/lists) | CurrentUser read-only | ✅ | ✅ | ✅ | ✅ |
| entity/finding/evidence/note/dataset POST+PATCH, ingestion job complete/cancel, dataset sources/upload/datasets/jobs | `CanMutateDep` | ✅ | ✅ | ✅ | ❌ 403 |
| `DELETE /investigations/{id}` | `SupervisorDep` | ❌ 403 | ✅ | ✅ | ❌ 403 |
| assistant `query`/`status`/`providers` | CurrentUser | ✅ | ✅ | ✅ | ✅ |
| `GET /admin/users`, `GET /admin/audit` | supervisor/admin/auditor | ❌ 403 | ✅ | ✅ | ✅ |
| `POST/PATCH /admin/users` | admin only | ❌ 403 | ❌ 403 | ✅ | ❌ 403 |
| deactivate/demote self | incumbent protection | — | ❌ 403 | ❌ 403 | — |

Every denial also records a `permission_denied` audit event carrying the
failing role.

## 7. Schema, migration & seed

- **New tables**: `users` (id, email unique, password_hash, display_name,
  role enum, is_active, timestamps) and `auth_audit_events` (id, user_id
  nullable FK ON DELETE SET NULL, email snapshot, action enum, details JSON,
  created_at). **18 model tables** total after `alembic upgrade head`.
- **Migration verified** on a fresh SQLite database (all 4 revisions apply
  cleanly) and `alembic upgrade head --sql` regenerates valid **PostgreSQL
  DDL** (`users` uses `BOOLEAN DEFAULT 1`, FKs `ON DELETE CASCADE` / `SET
  NULL`, unique email index).
- **Seed**: idempotent — running `python -m app.db.seed` twice yields exactly
  4 users each time; `DEMO_USER_LOGINS` prints the four accounts.
- Operation Meridian (inv-006) preset/demo data unchanged (seed is additive).

## 8. Demo credentials

Development/demo only. Seeded automatically with an empty/absent `DATABASE_URL`;
on Render they are added by the one-off `python -m app.db.seed` step.

| Email | Password | Role |
|---|---|---|
| `investigator@trinetra.dev` | `Investigator!2026` | investigator |
| `supervisor@trinetra.dev` | `Supervisor!2026` | supervisor |
| `admin@trinetra.dev` | `Admin!2026` | admin |
| `auditor@trinetra.dev` | `Auditor!2026` | auditor (read-only) |

## 9. Frontend security UX

- **Sign-in**: `/login` (client page; POSTs to `/api/v2/auth/login` in API
  mode, deterministic demo session in mock mode; `from=` return path; error
  alert; show/hide password; demo-credentials hint only in mock mode).
- **Route guard**: `AuthGate` wraps the dashboard layout — `hydrate()` on
  mount, redirect to `/login?from=…` in API mode when unauthenticated, never
  redirects in mock mode (guarded by `isMockData()`).
- **Session lifecycle**: `AuthBootstrap` registers `setOnUnauthorized` →
  `logout()`; any authenticated 401 ends the session and bounces to `/login`.
- **Profile**: role badge, display name, email, identifier, sign-out.
- **Security page** (`/security`): users table (admin) + audit trail
  (supervisor/admin/auditor); 403 from the backend surfaces a "denied" card,
  not an error.
- **Navigation**: Security nav item filtered by
  `filterRailItemsByRole`; auditor sees read-only everything.
- **Mutation gating**: New-investigation link, new-investigation page and the
  data-intelligence upload zone are disabled/hidden for the auditor.
- **Client**: `setAuthAccessToken` registers the JWT; requests carry
  `Authorization: Bearer`; `X-User-Id` is gone; FormData uploads keep no
  `Content-Type`.
- **Mock vs API**: mock mode self-provisions the investigator demo session so
  the SIH demo works with no backend; in API mode there is **no** anonymous
  fallback — the same token rules as production.

## 10. Test results

- **Backend**: `pytest tests -q` → **207 passed** (was 190), `ruff check .`
  clean, `ruff format` applied (unchanged behavior). The 17 new `test_auth_rbac.py`
  tests cover login validation bounds, no-enumeration 401, token
  missing/malformed/expired/non-bearer, `/me`, `X-User-Id` spoof rejection,
  forged ADMIN claim → 403, 401-vs-403 split, mutation matrix, delete gate,
  admin user management (create/update, self-demotion ban, immediate
  deactivation), audit gates + full action coverage, assistant protected/
  read-only.
- **Frontend**: `tsc --noEmit` clean; `eslint src` clean (1 pre-existing
  `no-page-custom-font` warning); `jest` → **81 suites / 667 tests** (was 78 /
  654; new bearer-contract client tests, auth store 5, AuthGate 1, login page 3);
  `next build` green in **both** mock (`NEXT_PUBLIC_USE_MOCK_API=true`) and API
  modes.
- **Verification artifacts**: `verify_181.db` cleaned up after checks.

## 11. Mock mode and Operation Meridian

Unchanged. Mock mode still renders the full demo universe (inv-006) from
in-memory services; the only addition is the deterministic demo session so the
UI is authenticated in mock mode. All mock tests pass. No Phase 17 behavior
regressed.

## 12. Kept honest / deferred

- **Live Render deployment + live managed-PostgreSQL verification: PENDING.**
  No Render API/CLI/gh access in the environment. Postgres is exercised via
  the SQLite override (portable types) and offline PostgreSQL DDL only. Manual
  Blueprint steps remain in `docs/RENDER_DEPLOYMENT.md`.
- Evidence payload blobs stay on the ephemeral Render filesystem (metadata +
  SHA-256 in PostgreSQL) — unchanged from 17.10.
- AI remains `AI_PROVIDER=mock`; a real `AI_API_KEY` is server-side config.
- JWT refresh-token rotation/revocation endpoints are not implemented; access
  tokens are the active mechanism and user deactivation takes effect
  immediately (checked per request from the DB).
- No password-recovery / account self-service UI.

## 13. Remaining work

- Perform the Blueprint deployment and verify migrations, seed (incl. the 4
  demo users) and login flow against the live managed PostgreSQL once Render
  access exists.
- **Phase 18.2 is explicitly NOT started.** The scope of this session is
  strictly Phase 18.1; nothing in this report should be read as Phase 18.2
  work or intention.