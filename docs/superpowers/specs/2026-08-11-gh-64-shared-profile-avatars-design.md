# GH-64 — Shared Profile Avatars for Management User, Attendance, and Booking

## Status

Design approved and scope-expanded on 2026-08-11. This specification is local-only and must not be pushed to GitHub unless the user explicitly asks later.

## Context

Backend issue #139 defines an additive read contract for employee profile-photo metadata:

- Management Attendance list/detail: `user.photo`, `user.photo_updated_at`
- Management Booking applicant projection: `user_photo`, `user_photo_updated_at`

Web FE currently renders truthful initials in Management Attendance and Management Booking. Management User already renders a photo when available and falls back to initials, but its table and detail drawer mutate the raw `photo` field when an image fails to load and its delete confirmation still uses initials-only presentation.

The goal of this change is to make avatar presentation architecture consistent across Management User, Management Attendance, and Management Booking without introducing extra user-detail/photo requests or expanding the scope to unrelated application avatars.

## Approved scope

Implement one shared avatar presentation contract across these seven Management surfaces:

1. Management User table
2. Management User detail drawer
3. Management User delete confirmation
4. Management Attendance table
5. Management Attendance detail drawer
6. Management Booking table
7. Management Booking detail drawer

The boundary is **all avatar presentation inside the Management User feature plus the approved Attendance and Booking surfaces**, not all avatars in the application.

Use the approved architecture: **shared avatar presentation utility + local feature markup**.

## Non-goals

This change does **not**:

- add a new endpoint
- add a new Management User request; the existing detail request remains as-is
- call `/users/:id` for Attendance/Booking table rows or Booking drawer identity
- call a dedicated photo endpoint
- change Backend photo ownership or upload/storage behavior
- redesign User, Attendance, or Booking business flows
- change pagination, filter, search, sort, decision, delete, or map semantics
- refactor Form User, global header, Profile page, auth/session avatar, or unrelated application avatar surfaces
- use `owner.jpg` or another person's image as a Management identity fallback
- repair unrelated Auth, Dashboard, FAHP, or WFA test failures

## Baseline

Local worktree base:

- repository: `Infinite-LearningV1/Infinite_Track_Fe`
- base: `develop@9bdfaf6`
- local branch: `feature/gh-64-shared-profile-avatars`

Fresh full-suite baseline after `npm ci`:

- 744 tests
- 723 passing
- 21 failing

The 21 failures are existing failures outside this avatar scope and are treated as non-blocking baseline evidence. Relevant Attendance, Booking, and Management User avatar suites are green before this change.

## Architecture decision

### Shared utility owns avatar presentation only

Add a small shared utility at:

`src/js/utils/userAvatarPresentation.js`

Its public contract is:

```js
createUserAvatarPresentation({ fullName, photo });
```

It returns presentation state only:

```js
{
  photoUrl: string | null,
  initials: string,
  avatarColor: string
}
```

Responsibilities:

- resolve a supplied photo URL for display
- derive initials from the Management identity name
- derive the existing deterministic initials color
- return `null` instead of a fabricated/default Management identity photo

It must not know about Management User, Attendance, Booking, API services, Alpine lifecycle, pagination, or navigation.

### Existing utilities remain reusable dependencies

The shared presentation utility should reuse:

- `getInitials()` from `src/js/utils/avatarUtils.js`
- `getAvatarColor()` from `src/js/utils/avatarUtils.js`
- `getUserPhotoUrl()` from `src/js/utils/photoValidation.js`

`getUserPhotoUrl()` currently defaults missing/invalid photos to `./images/user/owner.jpg`. That default is not truthful for arbitrary employees.

Therefore the avatar presentation utility must call it with an explicit null fallback:

```js
const photoUrl = getUserPhotoUrl(photo, null);
```

This keeps support for absolute HTTP/HTTPS URLs and existing legacy relative upload paths while ensuring absent/empty photos and unsupported `/src/` fallbacks resolve to `null`, not `owner.jpg`.

No change to the global default behavior of `getUserPhotoUrl()` is required in this issue because other profile/header consumers may depend on it.

## State ownership

Backend response fields remain evidence. Avatar load failure is presentation state.

The FE must preserve raw photo metadata separately from the mutable presentation object. A broken `<img>` must invalidate only `avatar.photoUrl`; it must not overwrite the raw `photo` evidence received from Backend.

## Management User data contract

Management User already receives canonical `photo` and `photo_updated_at` fields. This issue standardizes how those fields become presentation state without changing the existing list/detail request ownership.

### Directory row normalization

`mapDirectoryUser()` remains the owner of the Management User list projection. It preserves Backend evidence and adds shared presentation state:

```js
{
  photo: user.photo ?? null,
  photoUpdatedAt: user.photo_updated_at ?? user.photoUpdatedAt ?? null,
  avatar: createUserAvatarPresentation({
    fullName,
    photo: user.photo ?? null,
  })
}
```

Existing directory search, filters, sorting, pagination, WFH status, edit, delete, and detail-request semantics remain unchanged.

### Detail drawer normalization

`normalizeWfhLocation()` continues to own the detail drawer view model. It preserves the detail response photo metadata and adds:

```js
{
  photo: user.photo ?? null,
  photoUpdatedAt: user.photo_updated_at ?? user.photoUpdatedAt ?? null,
  avatar: createUserAvatarPresentation({
    fullName,
    photo: user.photo ?? null,
  })
}
```

The existing `getUserById()` detail request remains authoritative for the User detail drawer. No additional request is introduced for avatar rendering.

### Delete confirmation

`userToDelete` already points at a normalized directory row. The delete confirmation must consume `userToDelete.avatar`; it must not derive a second initials/color contract or make a user-detail request.

When an image fails in the User table, drawer, or delete confirmation, only the relevant `avatar.photoUrl` presentation field becomes `null`. Raw `photo` and `photoUpdatedAt` evidence remains unchanged.

## Attendance data contract

### List normalization

`normalizeAttendanceListRow()` remains the owner of the Backend-to-FE row mapping.

Given:

```json
{
  "user": {
    "full_name": "Ayu Lestari",
    "photo": "https://example.test/users/1/profile.jpg",
    "photo_updated_at": "2026-08-11T03:00:00.000Z"
  }
}
```

it adds:

```js
{
  photo: user.photo ?? null,
  photoUpdatedAt: user.photo_updated_at ?? null,
  avatar: createUserAvatarPresentation({
    fullName,
    photo: user.photo ?? null,
  })
}
```

Existing identity, attendance, status, location, checkout, and pagination semantics remain unchanged.

### Detail normalization

`normalizeAttendanceDetail()` continues to map the authoritative `GET /attendance/:id` response.

Its `employee` projection adds:

```js
employee: {
  fullName,
  nipNim,
  email,
  role,
  photo: employee.photo ?? null,
  photoUpdatedAt: employee.photo_updated_at ?? null,
  avatar: createUserAvatarPresentation({
    fullName,
    photo: employee.photo ?? null,
  }),
}
```

The drawer must not reuse a stale photo from the list row to replace a missing detail photo. The detail endpoint remains authoritative for the Attendance drawer.

`createEmptyAttendanceDetail()` must produce a safe empty avatar presentation so drawer close/reopen cannot leak the previous employee image.

## Booking data contract

`normalizeBooking()` remains the owner of the Backend-to-FE booking mapping. Backend canonical fields are `user_photo` and `user_photo_updated_at`.

The normalized Booking model adds:

```js
{
  employee_photo: booking.user_photo ?? null,
  employee_photo_updated_at: booking.user_photo_updated_at ?? null,
  employee_avatar: createUserAvatarPresentation({
    fullName: employeeName,
    photo: booking.user_photo ?? null,
  })
}
```

No new Backend alias is invented. `user_photo` and `user_photo_updated_at` are the only new API source fields for this mapping.

Management Booking detail review already uses the selected normalized booking row. The drawer must reuse `employee_avatar`; it must not issue a user-detail request merely to obtain a photo.

`photo_updated_at` is preserved as metadata but is not displayed and is not automatically appended to the image URL as a query parameter. Backend/storage remains responsible for the canonical photo URL.

## Data flow

```text
Backend #139
  -> feature normalizer
  -> raw photo metadata + avatar presentation
  -> local table/drawer markup
  -> image when avatar.photoUrl exists
  -> initials when avatar.photoUrl is null
```

There is no additional network hop in this flow.

## Rendering contract

Each of the seven target surfaces uses local Alpine markup with the same behavior:

```text
avatar.photoUrl present
  -> render <img>

avatar.photoUrl absent
  -> render initials circle

<img> load error
  -> set avatar.photoUrl = null
  -> Alpine switches to initials
```

Image requirements:

- circular crop
- `object-cover`
- fixed shrink-safe dimensions appropriate to the existing table/drawer layout
- `loading="lazy"` for table images
- no image loading spinner or separate request state
- no default employee stock image

The adjacent visible employee name is the accessible identity label. Avatar images should use `alt=""` to avoid announcing duplicate name text. Initials are decorative when the full name is adjacent and may be hidden from assistive technology.

A broken photo must not surface as a page-level/table-level error. It is a local presentation fallback only.

## Surface-specific presentation

### Management User table

Keep the existing `Pengguna` identity cell layout, but switch its avatar branch from direct `user.photo`/`getUserPhotoUrl()` handling to `user.avatar.photoUrl`. Broken image fallback must set only `user.avatar.photoUrl = null`.

### Management User detail drawer

Keep the existing profile header and existing `getUserById()` detail ownership. Render from `selectedUserLocation.avatar`; broken image fallback must not mutate `selectedUserLocation.photo`.

### Management User delete confirmation

Upgrade the existing initials-only identity block to photo-first/fallback presentation using `userToDelete.avatar`. Keep destructive confirmation copy, `HAPUS` validation, and delete behavior unchanged.

### Management Attendance table

Replace the current initials-only avatar inside the employee identity cell with photo-first/fallback markup. Keep the existing name, NIP/NIM, column structure, sorting contract, and row actions unchanged.

### Management Attendance detail drawer

Enhance the existing `Pegawai` section with an identity header containing avatar + name. Existing NIP/NIM, role, and email evidence remains available in the same section. This is not a drawer redesign.

### Management Booking table

Replace the current initials-only avatar inside the `Pemohon` cell with photo-first/fallback markup. Keep the existing eight-column approval queue, request context, status, and actions unchanged.

### Management Booking detail drawer

Enhance the existing `Pemohon` section with avatar + applicant name. Existing NIP/NIM, email, position, and role remain visible. Approval/rejection behavior, location map, suitability evidence, and decision context are unchanged.

## Network and source-of-truth rules

Forbidden for this feature:

- a new Management User request solely for avatar rendering
- `getUserById()` from Attendance/Booking list rendering
- per-row `/users/:id` calls
- a photo endpoint call
- client-side reconstruction of a storage URL
- replacing a missing Backend photo with another user's image

Management User detail keeps its existing `getUserById()` request because that request already owns the drawer detail contract. Attendance detail continues using its existing detail endpoint because that endpoint already owns drawer evidence. Booking drawer continues using its selected normalized booking projection.

## Expected implementation files

Production files expected to change:

- `src/js/utils/userAvatarPresentation.js` — new shared presentation utility
- `src/js/features/userManagement/userListSimple.js` — User directory row photo metadata + avatar presentation
- `src/js/features/userManagement/userDetailDrawerLifecycle.js` — User detail avatar presentation
- `src/partials/table/table-user.html` — User table + delete confirmation photo/fallback markup
- `src/partials/modal/user-detail-drawer.html` — User drawer photo/fallback markup
- `src/js/features/attendance/attendanceListRow.js` — Attendance list photo mapping
- `src/js/features/attendance/attendanceDetailDrawerLifecycle.js` — Attendance detail photo mapping
- `src/partials/table/table-attendance.html` — Attendance table photo/fallback markup
- `src/partials/modal/attendance-detail-drawer.html` — Attendance drawer identity avatar
- `src/js/features/wfaBooking/bookingList.contract.js` — Booking photo mapping
- `src/partials/table/table-booking.html` — Booking table photo/fallback markup
- `src/partials/modal/booking-detail-drawer.html` — Booking drawer identity avatar

`attendanceLog.js` and `bookingList.js` should change only if the implementation needs to expose an already-pure presentation helper to Alpine. The preferred design is to normalize the presentation object once so no extra component method is needed.

Form User, global header, Profile page, and auth/session avatar production files should not require modification.

## Test strategy

Use TDD. New behavior starts with failing focused tests before production changes.

### Shared utility tests

Verify:

- absolute HTTP/HTTPS photo is preserved
- supported relative photo path is normalized using existing behavior
- null/empty photo and unsupported `/src/` fallback resolve to `photoUrl: null`
- initials and color use existing avatar utilities
- no `owner.jpg` fallback is returned for absent employee photo
- a syntactically resolved URL that fails to load is handled by local `<img>` error fallback rather than treated as API failure

### Management User tests

Extend focused tests to prove:

- `mapDirectoryUser()` preserves `photo` and `photo_updated_at` evidence while creating `avatar`
- `normalizeWfhLocation()` preserves detail photo metadata while creating independent avatar presentation state
- empty/closed User drawer state cannot retain a previous user image
- User table renders photo-first/fallback from `user.avatar`
- User detail drawer renders from `selectedUserLocation.avatar`
- delete confirmation renders from `userToDelete.avatar`
- image error invalidates only `avatar.photoUrl`, never raw `photo`
- existing User directory query, detail request, WFH map, delete, and accessibility tests remain green

### Attendance tests

Extend focused tests to prove:

- list normalization preserves `user.photo` and `user.photo_updated_at`
- list normalization creates independent avatar presentation state
- detail normalization preserves photo metadata in `employee`
- empty/closed drawer state cannot retain a previous employee photo
- table template contains photo-first and initials-fallback branches
- detail drawer contains photo-first and initials-fallback branches
- image error invalidates only presentation photo state
- existing Attendance detail lifecycle/map tests remain green

### Booking tests

Extend focused tests to prove:

- canonical `user_photo` maps to `employee_photo`
- canonical `user_photo_updated_at` maps to `employee_photo_updated_at`
- normalized booking contains `employee_avatar`
- table template contains photo-first and initials-fallback branches
- detail drawer uses the selected normalized applicant avatar
- image error invalidates only presentation photo state
- no additional user-detail request is introduced
- existing booking decision, rejection, map, pagination, and delete tests remain green

### Cross-feature regression

Existing Management User photo/fallback tests must remain green to prove the new shared behavior does not weaken the established reference implementation.

## Verification requirements

Minimum completion evidence:

1. focused shared-avatar utility tests pass
2. focused Attendance normalization + table + drawer tests pass
3. focused Booking normalization + table + drawer tests pass
4. focused Management User list + drawer + delete avatar tests pass
5. `npm run build` exits 0
6. targeted Prettier check passes for every changed source/test/doc file
7. `git diff --check` passes
8. full `node --test` is rerun and compared against the 723-pass / 21-fail baseline

The feature must not claim the repository-wide suite is green unless the unrelated baseline failures are separately resolved.

A new failure in Attendance, Booking, Management User avatar, shared avatar utility, or build is blocking even if the global baseline already contains failures.

## Backend dependency

Web FE implementation depends on Backend #139 supplying the approved additive fields. FE unit/template work can be developed with fixtures, but runtime acceptance requires a Backend environment that actually returns those fields.

Graceful compatibility is required while Backend rollout is incomplete:

- missing photo fields normalize to `null`
- initials continue rendering
- no error is thrown because an older Backend omits photo metadata

This compatibility does not authorize a per-row fallback request to User APIs.

## Definition of Done

- profile photos render when Backend supplies a usable photo URL
- initials render when photo metadata is missing/empty, when it resolves to no usable photo URL, or when the image fails to load
- Attendance table and detail drawer are consistent
- Booking table and detail drawer are consistent
- no N+1 user/photo request is introduced
- raw Backend photo metadata remains separate from mutable image-load presentation state
- Management User table, detail drawer, and delete confirmation use the shared avatar presentation contract
- existing User/Attendance/Booking business semantics remain unchanged
- production build succeeds
- focused formatting and whitespace checks succeed
- full-suite result is reported relative to the recorded baseline

## Risks and mitigations

### Risk: fallback utility fabricates `owner.jpg`

Mitigation: the new presentation utility explicitly passes `null` as the fallback to `getUserPhotoUrl()` and tests this behavior.

### Risk: broken image mutates Backend evidence

Mitigation: keep `photo`/`photoUpdatedAt` raw fields separate from `avatar.photoUrl`; image error changes only the presentation field.

### Risk: stale Attendance drawer identity

Mitigation: empty/close lifecycle must rebuild empty avatar state, and detail response remains the only drawer identity authority.

### Risk: accidental Booking N+1

Mitigation: Booking drawer consumes the normalized selected row; tests/source review reject new `getUserById()`/photo requests.

### Risk: Management User refactor accidentally adds network work

Mitigation: User table and delete confirmation consume normalized directory rows, while User drawer keeps only its existing detail request; tests reject any new request solely for avatar rendering.

### Risk: unrelated baseline failures obscure regressions

Mitigation: focused avatar/Attendance/Booking/User suites are mandatory gates, and the full suite is compared against the recorded 723-pass / 21-fail baseline rather than treated as a green baseline.

## Scope protection

Any request to redesign identity cards, expand the shared avatar contract to Form User/global header/Profile/auth/session or other application surfaces, alter Backend contracts, change upload/storage behavior, or fix the 21 unrelated baseline failures requires separate scope/design approval.
