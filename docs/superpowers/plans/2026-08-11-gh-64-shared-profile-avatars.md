# GH-64 Shared Management Profile Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use one truthful avatar presentation contract across Management User, Management Attendance, and Management Booking without adding network requests or mutating raw Backend photo evidence.

**Architecture:** Each feature normalizer preserves Backend photo metadata and derives a separate mutable avatar presentation object through `createUserAvatarPresentation({ fullName, photo })`. Local Alpine templates render `avatar.photoUrl` first and fall back to initials; an image load error sets only presentation `photoUrl` to `null`.

**Tech Stack:** Vanilla JavaScript ES modules, Alpine.js templates, Node.js `node:test`, Tailwind CSS, Prettier, Webpack.

## Global Constraints

- Base design: `docs/superpowers/specs/2026-08-11-gh-64-shared-profile-avatars-design.md`.
- Implementation branch/worktree: `feature/gh-64-shared-profile-avatars`, based on `develop@9bdfaf6` unless execution-time base verification requires a deliberate update.
- Keep all work local until the user explicitly requests a GitHub push or PR.
- Scope is exactly seven surfaces: User table, User detail drawer, User delete confirmation, Attendance table/detail drawer, Booking table/detail drawer.
- Form User, global header, Profile, auth/session avatars, and unrelated application avatar surfaces stay out of scope.
- No new endpoint, photo endpoint, per-row `/users/:id`, or other N+1 request.
- Management User keeps its existing detail request; no new request may exist solely for avatar rendering.
- Raw `photo` / photo timestamp fields are Backend evidence and must not be mutated on image load failure.
- Broken image behavior is local presentation fallback only: set `avatar.photoUrl = null` (or `employee_avatar.photoUrl = null`).
- Missing photo fields from older Backend responses normalize safely to `null` and render initials.
- Never use `owner.jpg` or another person's image as a Management identity fallback.
- Preserve User/Attendance/Booking search, filter, sort, pagination, delete, decision, map, and navigation semantics.
- `photo_updated_at` is metadata only; do not synthesize cache-busting query parameters.
- Fresh repository baseline is 744 tests / 723 pass / 21 existing failures; those unrelated failures are non-blocking only if no new relevant failure is introduced.
- Focused baseline for Attendance, Booking, and Management User avatar-related tests is 87/87 passing.

## File Structure

- Create `src/js/utils/userAvatarPresentation.js` — pure shared avatar presentation builder.
- Create `tests/user-avatar-presentation.test.js` — direct contract tests for the shared builder.
- Modify `src/js/features/userManagement/userListSimple.js:22-43` — normalize User directory photo metadata + avatar presentation.
- Modify `src/js/features/userManagement/userDetailDrawerLifecycle.js:19-37` — normalize User detail photo metadata + avatar presentation.
- Modify `src/partials/table/table-user.html:233-252, 548-566` — User table + delete confirmation avatar rendering.
- Modify `src/partials/modal/user-detail-drawer.html:75-97` — User drawer avatar rendering.
- Modify `tests/user-directory-server-state.test.js` — directory projection and no-extra-request regression.
- Modify `tests/user-detail-drawer-lifecycle.test.js:406-455` — User detail raw/presentation separation.
- Modify `tests/user-table-structure.test.js:184-194` — User table/delete avatar template contract.
- Modify `tests/user-detail-drawer-template.test.js:85-97` — User drawer template contract.
- Modify `src/js/features/attendance/attendanceListRow.js:21-49` — list photo metadata + avatar presentation.
- Modify `src/js/features/attendance/attendanceDetailDrawerLifecycle.js:6-40` — detail photo metadata + avatar presentation.
- Modify `src/partials/table/table-attendance.html:294-315` — Attendance table avatar.
- Modify `src/partials/modal/attendance-detail-drawer.html:116-145` — Attendance employee identity avatar.
- Modify `tests/attendance-list-row.test.js` — list mapping contract.
- Modify `tests/attendance-detail-drawer-lifecycle.test.js` — detail/empty lifecycle contract.
- Modify `tests/attendance-audit-table.test.js` — table template contract.
- Modify `tests/attendance-detail-drawer-template.test.js` — drawer template contract.
- Modify `src/js/features/wfaBooking/bookingList.contract.js:51-114` — Booking applicant photo metadata + presentation.
- Modify `src/partials/table/table-booking.html:175-195` — Booking table avatar.
- Modify `src/partials/modal/booking-detail-drawer.html:50-75` — Booking applicant identity avatar.
- Modify `tests/booking-management-normalization.test.js` — canonical photo field mapping.
- Modify `tests/booking-management-table.test.js` — table template contract.
- Modify `tests/booking-detail-drawer-template.test.js` — selected Booking drawer avatar contract.

---

### Task 1: Shared Avatar Presentation Utility

**Files:**

- Create: `src/js/utils/userAvatarPresentation.js`
- Create: `tests/user-avatar-presentation.test.js`

**Interfaces:**

- Consumes: `getInitials(fullName)`, `getAvatarColor(fullName)`, `getUserPhotoUrl(photo, null)`.
- Produces: `createUserAvatarPresentation({ fullName, photo }) -> { photoUrl, initials, avatarColor }`.
- [ ] **Step 1: Write the failing utility contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { getAvatarColor } from "../src/js/utils/avatarUtils.js";
import { createUserAvatarPresentation } from "../src/js/utils/userAvatarPresentation.js";

test("builds photo-first presentation without a fabricated fallback", () => {
  assert.deepEqual(
    createUserAvatarPresentation({
      fullName: "Ayu Lestari",
      photo: "https://cdn.example.com/ayu.jpg",
    }),
    {
      photoUrl: "https://cdn.example.com/ayu.jpg",
      initials: "AL",
      avatarColor: getAvatarColor("Ayu Lestari"),
    },
  );
});

test("missing employee photo resolves to null instead of owner.jpg", () => {
  const avatar = createUserAvatarPresentation({
    fullName: "Ayu Lestari",
    photo: null,
  });
  assert.equal(avatar.photoUrl, null);
  assert.notEqual(avatar.photoUrl, "./images/user/owner.jpg");
});
```

In the first test, import `getAvatarColor` and compare against `getAvatarColor("Ayu Lestari")`; do not hard-code Tailwind palette internals.
Add cases for `"uploads/users/7/profile/a.jpg"`, empty string, and `"/src/images/user/default-avatar.jpg"`; the last two must produce `photoUrl: null`.

- [ ] **Step 2: Run the utility test and verify RED**

Run:

```powershell
node --test tests/user-avatar-presentation.test.js
```

Expected: FAIL because `src/js/utils/userAvatarPresentation.js` does not exist yet.

- [ ] **Step 3: Implement the minimal pure utility**

```js
import { getInitials, getAvatarColor } from "./avatarUtils.js";
import { getUserPhotoUrl } from "./photoValidation.js";

export function createUserAvatarPresentation({
  fullName = "",
  photo = null,
} = {}) {
  const safeName = typeof fullName === "string" ? fullName : "";
  return {
    photoUrl: getUserPhotoUrl(photo, null),
    initials: getInitials(safeName),
    avatarColor: getAvatarColor(safeName),
  };
}
```

Do not change the default parameter inside `getUserPhotoUrl()`; other global consumers may depend on its existing default.

- [ ] **Step 4: Run utility tests and verify GREEN**

```powershell
node --test tests/user-avatar-presentation.test.js
```

Expected: all utility cases pass.

- [ ] **Step 5: Commit Task 1 locally**

```powershell
git add src/js/utils/userAvatarPresentation.js tests/user-avatar-presentation.test.js
git commit -m "feat(GH-64): add shared avatar presentation contract"
```

Do not push.

---

### Task 2: Unify All Management User Avatar Presentation

**Files:**

- Modify: `src/js/features/userManagement/userListSimple.js:13-43`
- Modify: `src/js/features/userManagement/userDetailDrawerLifecycle.js:1-37`
- Modify: `src/partials/table/table-user.html:233-252, 548-566`
- Modify: `src/partials/modal/user-detail-drawer.html:75-97`
- Modify: `tests/user-directory-server-state.test.js`
- Modify: `tests/user-detail-drawer-lifecycle.test.js:406-455`
- Modify: `tests/user-table-structure.test.js:184-194`
- Modify: `tests/user-detail-drawer-template.test.js:85-97`

**Interfaces:**

- Consumes: `createUserAvatarPresentation({ fullName, photo })` from Task 1.
- Produces directory rows with `photo`, `photoUpdatedAt`, `avatar`; drawer state with the same raw/presentation separation.

- [ ] **Step 1: Extend User tests first**

In `tests/user-directory-server-state.test.js`, make a directory fixture contain:

```js
photo: "https://cdn.example.com/users/11/profile.jpg",
photo_updated_at: "2026-08-11T03:00:00.000Z",
```

After `await data.fetchUsers()`, assert:

```js
assert.equal(
  data.users[0].photo,
  "https://cdn.example.com/users/11/profile.jpg",
);
assert.equal(data.users[0].photoUpdatedAt, "2026-08-11T03:00:00.000Z");
assert.equal(
  data.users[0].avatar.photoUrl,
  "https://cdn.example.com/users/11/profile.jpg",
);
assert.equal(data.users[0].avatar.initials, "AS");
```

Keep the existing assertion that `openUserDetails(47)` performs exactly the existing one `getUserById(47)` request; do not add any avatar-related request.

In `tests/user-detail-drawer-lifecycle.test.js`, replace the old initials/color-only assertions with:

```js
const location = normalizeWfhLocation({
  full_name: "Foto User",
  photo: "https://cdn.example.com/user.jpg",
  photo_updated_at: "2026-08-11T03:00:00.000Z",
});
assert.equal(location.photo, "https://cdn.example.com/user.jpg");
assert.equal(location.photoUpdatedAt, "2026-08-11T03:00:00.000Z");
assert.equal(location.avatar.photoUrl, "https://cdn.example.com/user.jpg");
```

Also assert `createEmptyWfhLocation().photo === null` and `createEmptyWfhLocation().avatar.photoUrl === null`.

Update the two template suites to require `user.avatar.photoUrl` / `selectedUserLocation.avatar.photoUrl`, `avatar.initials`, and `avatar.avatarColor`. Add negative assertions rejecting `@error="user.photo = null"` and `@error="selectedUserLocation.photo = null"`. For delete confirmation, require photo-first/fallback branches bound to `userToDelete.avatar`.

- [ ] **Step 2: Run focused User tests and verify RED**

```powershell
node --test tests/user-directory-server-state.test.js tests/user-detail-drawer-lifecycle.test.js tests/user-table-structure.test.js tests/user-detail-drawer-template.test.js
```

Expected: FAIL because current User models/templates still expose/mutate the legacy photo/initials fields.

- [ ] **Step 3: Normalize User directory and detail state through the shared utility**

In `userListSimple.js`, replace the direct initials/color derivation inside `mapDirectoryUser()` with:

```js
const photo = user.photo ?? null;
const photoUpdatedAt = user.photo_updated_at ?? null;
const avatar = createUserAvatarPresentation({ fullName, photo });

return {
  ...user,
  fullName,
  // existing role/position/location fields unchanged
  photo,
  photoUpdatedAt,
  avatar,
};
```

Import `createUserAvatarPresentation` and remove `getInitials` / `getAvatarColor` imports and Alpine wrapper methods only after confirming no remaining Management User template needs them.

In `normalizeWfhLocation()`:

```js
const photo = user.photo ?? null;
return {
  // existing identity/location fields unchanged
  photo,
  photoUpdatedAt: user.photo_updated_at ?? user.photoUpdatedAt ?? null,
  avatar: createUserAvatarPresentation({ fullName, photo }),
};
```

- [ ] **Step 4: Update all three Management User surfaces**

Use this local markup contract for table and drawer (with the surface-specific object name):

```html
<template x-if="user.avatar.photoUrl">
  <img
    :src="user.avatar.photoUrl"
    alt=""
    class="h-10 w-10 rounded-full object-cover"
    @error="user.avatar.photoUrl = null"
    loading="lazy"
  />
</template>
<template x-if="!user.avatar.photoUrl">
  <div :class="user.avatar.avatarColor" aria-hidden="true">
    <span x-text="user.avatar.initials"></span>
  </div>
</template>
```

Use `selectedUserLocation.avatar` in the drawer and `userToDelete.avatar` in the delete confirmation. The delete confirmation image may use `h-12 w-12`; drawer stays `h-16 w-16`. Preserve adjacent name/email/role text and all destructive-confirmation semantics.

- [ ] **Step 5: Run focused User tests and verify GREEN**

```powershell
node --test tests/user-directory-server-state.test.js tests/user-detail-drawer-lifecycle.test.js tests/user-table-structure.test.js tests/user-detail-drawer-template.test.js
```

Expected: all pass, including the existing single detail-request contract.

- [ ] **Step 6: Commit Task 2 locally**

```powershell
git add src/js/features/userManagement/userListSimple.js src/js/features/userManagement/userDetailDrawerLifecycle.js src/partials/table/table-user.html src/partials/modal/user-detail-drawer.html tests/user-directory-server-state.test.js tests/user-detail-drawer-lifecycle.test.js tests/user-table-structure.test.js tests/user-detail-drawer-template.test.js
git commit -m "refactor(GH-64): unify management user avatar presentation"
```

Do not push.

---

### Task 3: Management Attendance Photo Projection and Rendering

**Files:**

- Modify: `src/js/features/attendance/attendanceListRow.js:21-49`
- Modify: `src/js/features/attendance/attendanceDetailDrawerLifecycle.js:6-40`
- Modify: `src/partials/table/table-attendance.html:294-315`
- Modify: `src/partials/modal/attendance-detail-drawer.html:116-145`
- Modify: `tests/attendance-list-row.test.js`
- Modify: `tests/attendance-detail-drawer-lifecycle.test.js`
- Modify: `tests/attendance-audit-table.test.js`
- Modify: `tests/attendance-detail-drawer-template.test.js`

**Interfaces:**

- Consumes: Backend list/detail `user.photo`, `user.photo_updated_at`; Task 1 presentation utility.
- Produces: list row `photo`, `photoUpdatedAt`, `avatar`; detail `employee.photo`, `employee.photoUpdatedAt`, `employee.avatar`.
- [ ] **Step 1: Extend Attendance list/detail tests first**

Add to the canonical list fixture:

```js
user: {
  id: 45,
  full_name: "Muhammad Rizki Ramdani",
  nip_nim: "EMP-045",
  role: "Employee",
  photo: "https://cdn.example.com/users/45/profile.jpg",
  photo_updated_at: "2026-08-11T03:00:00.000Z",
},
```

Assert the normalized row contains the same raw URL/timestamp and `avatar.photoUrl` equal to the URL. Add a missing-photo case asserting both `photo` and `avatar.photoUrl` are `null`.

In detail lifecycle tests, add the same fields under `response.data.user`, assert them under `detail.employee`, and assert `createEmptyAttendanceDetail().employee.avatar.photoUrl === null` so close/reopen cannot leak a previous image.

Update template tests to require:

```text
log.avatar.photoUrl / log.avatar.initials / log.avatar.avatarColor
selectedAttendanceDetail.employee.avatar.photoUrl
```

and `@error` must mutate only the corresponding `.avatar.photoUrl`.

- [ ] **Step 2: Run focused Attendance tests and verify RED**

```powershell
node --test tests/attendance-list-row.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-template.test.js
```

Expected: FAIL because photo fields and avatar presentation are not mapped/rendered yet.

- [ ] **Step 3: Implement Attendance normalization**

In `normalizeAttendanceListRow()`:

```js
const photo = user.photo ?? null;
return {
  // existing list fields unchanged
  photo,
  photoUpdatedAt: user.photo_updated_at ?? null,
  avatar: createUserAvatarPresentation({
    fullName: user.full_name ?? "",
    photo,
  }),
};
```

In `normalizeAttendanceDetail()` add inside `employee`:

```js
photo: employee.photo ?? null,
photoUpdatedAt: employee.photo_updated_at ?? null,
avatar: createUserAvatarPresentation({
  fullName: employee.full_name ?? "",
  photo: employee.photo ?? null,
}),
```

Import `createUserAvatarPresentation` in both normalization modules. Do not move map/location/status semantics into the avatar utility.

- [ ] **Step 4: Render Attendance table and drawer**

Replace the initials-only table circle with photo-first/fallback branches bound to `log.avatar`. Keep table image `loading="lazy"`, `alt=""`, `object-cover`, and `h-10 w-10`.

Inside the existing `Pegawai` drawer section, add an identity row before the existing evidence `<dl>`:

```html
<div class="mt-4 flex items-center gap-3">
  <template x-if="selectedAttendanceDetail.employee.avatar.photoUrl">
    <img
      :src="selectedAttendanceDetail.employee.avatar.photoUrl"
      alt=""
      class="h-12 w-12 shrink-0 rounded-full object-cover"
      @error="selectedAttendanceDetail.employee.avatar.photoUrl = null"
    />
  </template>
  <template x-if="!selectedAttendanceDetail.employee.avatar.photoUrl">
    <div
      :class="selectedAttendanceDetail.employee.avatar.avatarColor"
      aria-hidden="true"
    >
      <span x-text="selectedAttendanceDetail.employee.avatar.initials"></span>
    </div>
  </template>
  <p x-text="selectedAttendanceDetail.employee.fullName || '-' "></p>
</div>
```

Retain existing NIP/NIM, role, email, attendance, and location evidence; this is not a drawer redesign.

- [ ] **Step 5: Run focused Attendance tests and verify GREEN**

```powershell
node --test tests/attendance-list-row.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-template.test.js tests/attendance-list-state.test.js tests/attendance-delete-recovery.test.js
```

Expected: all focused Attendance suites pass.

- [ ] **Step 6: Commit Task 3 locally**

```powershell
git add src/js/features/attendance/attendanceListRow.js src/js/features/attendance/attendanceDetailDrawerLifecycle.js src/partials/table/table-attendance.html src/partials/modal/attendance-detail-drawer.html tests/attendance-list-row.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-template.test.js
git commit -m "feat(GH-64): render attendance profile avatars"
```

Do not push.

---

### Task 4: Management Booking Applicant Photo Projection and Rendering

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.contract.js:51-114`
- Modify: `src/partials/table/table-booking.html:175-195`
- Modify: `src/partials/modal/booking-detail-drawer.html:50-75`
- Modify: `tests/booking-management-normalization.test.js`
- Modify: `tests/booking-management-table.test.js`
- Modify: `tests/booking-detail-drawer-template.test.js`
  **Interfaces:**
- Consumes: Backend canonical `user_photo`, `user_photo_updated_at`; Task 1 presentation utility.
- Produces: `employee_photo`, `employee_photo_updated_at`, `employee_avatar` on every normalized Booking.

- [ ] **Step 1: Extend Booking normalization/template tests first**

Add to the canonical Backend fixture:

```js
user_photo: "https://cdn.example.com/users/42/profile.jpg",
user_photo_updated_at: "2026-08-11T03:00:00.000Z",
```

Assert:

```js
const normalized = normalizeBooking(backendRow);
assert.equal(normalized.employee_photo, backendRow.user_photo);
assert.equal(
  normalized.employee_photo_updated_at,
  backendRow.user_photo_updated_at,
);
assert.equal(normalized.employee_avatar.photoUrl, backendRow.user_photo);
```

Add a no-photo fixture asserting `employee_photo === null` and `employee_avatar.photoUrl === null`.

Update `booking-management-table.test.js` to require photo-first/fallback markup bound to `booking.employee_avatar`; reject initials-only markup as the sole avatar path.

Update `booking-detail-drawer-template.test.js` to require the `Pemohon` section to consume `selectedBooking.employee_avatar`, not any User API lookup or global photo helper.

- [ ] **Step 2: Run focused Booking tests and verify RED**

```powershell
node --test tests/booking-management-normalization.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-template.test.js
```

Expected: FAIL because Booking currently has no applicant photo presentation fields.

- [ ] **Step 3: Implement Booking normalization**

At the start of `normalizeBooking()` derive the canonical applicant identity once:

```js
const employeeName = booking.user_full_name ?? booking.employee_name ?? "";
const employeePhoto = booking.user_photo ?? null;
const employeePhotoUpdatedAt = booking.user_photo_updated_at ?? null;
const employeeAvatar = createUserAvatarPresentation({
  fullName: employeeName,
  photo: employeePhoto,
});
```

Return:

```js
employee_name: employeeName,
employee_photo: employeePhoto,
employee_photo_updated_at: employeePhotoUpdatedAt,
employee_avatar: employeeAvatar,
```

Keep the remaining schedule/status/location/reason/suitability/processor mappings exactly as they are. Do not add processor avatar fields.

- [ ] **Step 4: Render Booking table and drawer**
      In `table-booking.html`, replace the initials-only applicant circle with photo-first/fallback branches bound to `booking.employee_avatar`; table image is lazy, circular, and `object-cover`.

In the existing `Pemohon` drawer section, render avatar + applicant name using `selectedBooking.employee_avatar` before the existing identity `<dl>`. On error:

```html
@error="selectedBooking.employee_avatar.photoUrl = null"
```

Do not fetch User detail. Keep approval/rejection, map, suitability, status, and processor evidence unchanged.

- [ ] **Step 5: Run focused Booking tests and regression suites**

```powershell
node --test tests/booking-management-normalization.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-template.test.js tests/booking-detail-drawer-lifecycle.test.js tests/booking-management-list-state.test.js tests/booking-management-decision-state.test.js tests/booking-management-delete.test.js tests/booking-management-directory-query.test.js
```

Expected: all pass.

- [ ] **Step 6: Commit Task 4 locally**

```powershell
git add src/js/features/wfaBooking/bookingList.contract.js src/partials/table/table-booking.html src/partials/modal/booking-detail-drawer.html tests/booking-management-normalization.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-template.test.js
git commit -m "feat(GH-64): render booking applicant profile avatars"
```

Do not push.

---

### Task 5: Cross-Feature Verification, Build, and Runtime Evidence Boundary

**Files:**

- No planned production changes.
- Verify all Task 1-4 files plus the approved spec and this plan.

**Interfaces:**

- Consumes: all normalized avatar contracts from Tasks 1-4.
- Produces: completion evidence; no new feature API.

- [ ] **Step 1: Run the focused cross-feature avatar gate**

```powershell
node --test tests/user-avatar-presentation.test.js tests/user-directory-server-state.test.js tests/user-detail-drawer-lifecycle.test.js tests/user-table-structure.test.js tests/user-detail-drawer-template.test.js tests/attendance-list-row.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-template.test.js tests/booking-management-normalization.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-template.test.js
```

Expected: 0 failures.

- [ ] **Step 2: Run neighboring business regression suites**

```powershell
node --test tests/attendance-list-state.test.js tests/attendance-delete-recovery.test.js tests/attendance-directory-query.test.js tests/booking-detail-drawer-lifecycle.test.js tests/booking-management-list-state.test.js tests/booking-management-decision-state.test.js tests/booking-management-delete.test.js tests/booking-management-directory-query.test.js tests/user-list-filter-state.test.js tests/user-directory-query.test.js
```

Expected: 0 failures; avatar work must not change pagination/filter/delete/decision/map behavior.

- [ ] **Step 3: Remove stale direct avatar helpers only where they became unused**

After template changes, search the target modules/templates for direct avatar presentation calls:

```powershell
Select-String -Path src/js/features/userManagement/userListSimple.js,src/js/features/attendance/attendanceLog.js,src/js/features/wfaBooking/bookingList.js,src/partials/table/table-user.html,src/partials/table/table-attendance.html,src/partials/table/table-booking.html -Pattern 'getInitials|getAvatarColor|getUserPhotoUrl'
```

Remove imports/wrapper methods only when no non-avatar behavior still consumes them. Do not refactor unrelated callers in Header/Profile/Form User.

Also verify the seven surfaces do not mutate raw photo evidence:

```powershell
Select-String -Path src/partials/table/table-user.html,src/partials/modal/user-detail-drawer.html,src/partials/table/table-attendance.html,src/partials/modal/attendance-detail-drawer.html,src/partials/table/table-booking.html,src/partials/modal/booking-detail-drawer.html -Pattern 'photo\s*=\s*null'
```

Expected: only `.avatar.photoUrl = null` or `.employee_avatar.photoUrl = null` error handlers; no raw `.photo = null`.

- [ ] **Step 4: Format/check every changed file**

Run Prettier write only on the changed files, then check them:

```powershell
npx prettier --write src/js/utils/userAvatarPresentation.js src/js/features/userManagement/userListSimple.js src/js/features/userManagement/userDetailDrawerLifecycle.js src/js/features/attendance/attendanceListRow.js src/js/features/attendance/attendanceDetailDrawerLifecycle.js src/js/features/wfaBooking/bookingList.contract.js src/partials/table/table-user.html src/partials/modal/user-detail-drawer.html src/partials/table/table-attendance.html src/partials/modal/attendance-detail-drawer.html src/partials/table/table-booking.html src/partials/modal/booking-detail-drawer.html tests/user-avatar-presentation.test.js tests/user-directory-server-state.test.js tests/user-detail-drawer-lifecycle.test.js tests/user-table-structure.test.js tests/user-detail-drawer-template.test.js tests/attendance-list-row.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-template.test.js tests/booking-management-normalization.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-template.test.js docs/superpowers/specs/2026-08-11-gh-64-shared-profile-avatars-design.md docs/superpowers/plans/2026-08-11-gh-64-shared-profile-avatars.md
```

Then:

```powershell
npx prettier --check src/js/utils/userAvatarPresentation.js src/js/features/userManagement/userListSimple.js src/js/features/userManagement/userDetailDrawerLifecycle.js src/js/features/attendance/attendanceListRow.js src/js/features/attendance/attendanceDetailDrawerLifecycle.js src/js/features/wfaBooking/bookingList.contract.js src/partials/table/table-user.html src/partials/modal/user-detail-drawer.html src/partials/table/table-attendance.html src/partials/modal/attendance-detail-drawer.html src/partials/table/table-booking.html src/partials/modal/booking-detail-drawer.html tests/user-avatar-presentation.test.js tests/user-directory-server-state.test.js tests/user-detail-drawer-lifecycle.test.js tests/user-table-structure.test.js tests/user-detail-drawer-template.test.js tests/attendance-list-row.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-template.test.js tests/booking-management-normalization.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-template.test.js docs/superpowers/specs/2026-08-11-gh-64-shared-profile-avatars-design.md docs/superpowers/plans/2026-08-11-gh-64-shared-profile-avatars.md
```

Expected: all named files pass formatting.

- [ ] **Step 5: Run production build**

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 6: Run full repository test suite and compare with baseline**

```powershell
node --test
```

Record the fresh totals. Baseline before this feature is:

```text
744 tests
723 pass
21 fail
```

Acceptance: no new failure in User/Attendance/Booking/shared-avatar scope. If the same unrelated 21 failures remain, report them as pre-existing baseline; do not claim the repository-wide suite is green. If counts/names differ, inspect the delta before proceeding.

- [ ] **Step 7: Audit bounded diff and whitespace**

```powershell
git diff --check 9bdfaf6...HEAD
git diff --stat 9bdfaf6...HEAD
git diff --name-only 9bdfaf6...HEAD
git status --short --branch
git log --oneline 9bdfaf6..HEAD
```

Expected production diff is limited to the shared utility, approved User/Attendance/Booking normalizers/templates, focused tests, spec, and plan. There must be no service/API additions, package/lock changes, global header/Profile/Form User changes, or unrelated redesign.

- [ ] **Step 8: Runtime verification only when Backend #139 fields are available**

With an authenticated Management runtime backed by Backend #139, verify:

```text
User table: photo present -> image; no photo -> initials
User drawer: photo present -> image; broken image -> initials without losing raw evidence
User delete confirmation: same selected user avatar/fallback
Attendance table: image/fallback from list projection
Attendance drawer: image/fallback from detail projection
Booking table: applicant image/fallback from booking projection
Booking drawer: same normalized applicant avatar, no extra User request
```

Use browser Network tools to confirm no new per-row User/photo request. If a compatible authenticated runtime is unavailable, record runtime avatar acceptance as `Needs Verification`; do not create credentials or invent evidence.

- [ ] **Step 9: Commit verification-only corrections if any**

If verification required code/test corrections, rerun the affected focused tests, formatting check, build, and full suite before committing. Otherwise do not create a meaningless verification commit.

---
