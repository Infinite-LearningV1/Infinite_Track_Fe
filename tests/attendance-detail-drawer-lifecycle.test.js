import test from "node:test";
import assert from "node:assert/strict";
import { getAvatarColor, getInitials } from "../src/js/utils/avatarUtils.js";

import {
  createAttendanceDetailDrawerLifecycle,
  createEmptyAttendanceDetail,
  normalizeAttendanceDetail,
} from "../src/js/features/attendance/attendanceDetailDrawerLifecycle.js";
import { attendanceLogAlpineData } from "../src/js/features/attendance/attendanceLog.js";

const liveDetailEnvelope = {
  success: true,
  message: "Detail absensi berhasil diambil",
  data: {
    id_attendance: 9,
    attendance_date: "2026-07-28",
    time_in: "08:00",
    time_out: "17:00",
    work_duration: "09:00",
    mode: { key: "wfh", label: "WFH" },
    status: { key: "ontime", label: "Tepat Waktu" },
    notes: "Backend detail",
    booking_id: 77,
    user: {
      full_name: "Ayu",
      nip_nim: "123",
      email: "ayu@test",
      role: "Staff",
      photo: "https://cdn.example.com/users/45/profile.jpg",
      photo_updated_at: "2026-08-11T03:00:00.000Z",
    },
    location: { latitude: "0", longitude: "119.8" },
  },
};

const fullDetail = (overrides = {}) => ({
  ...liveDetailEnvelope,
  data: {
    ...liveDetailEnvelope.data,
    ...overrides,
    user: { ...liveDetailEnvelope.data.user, ...overrides.user },
    mode: { ...liveDetailEnvelope.data.mode, ...overrides.mode },
    status: { ...liveDetailEnvelope.data.status, ...overrides.status },
  },
});

function createMapAdapter() {
  const calls = [];
  let live = false;

  return {
    calls,
    get live() {
      return live;
    },
    initialize(detail) {
      if (live) throw new Error("map already live");
      live = true;
      calls.push({ type: "initialize", detail });
    },
    destroy() {
      live = false;
      calls.push({ type: "destroy" });
    },
  };
}

function createManualClock() {
  let nextId = 1;
  const pending = new Map();

  return {
    schedule(callback) {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancel(id) {
      pending.delete(id);
    },
    flush() {
      for (const [id, callback] of [...pending]) {
        pending.delete(id);
        callback();
      }
    },
  };
}

function createDeferredMapAdapter(clock) {
  const calls = [];
  let pending = null;
  let live = false;

  return {
    calls,
    get live() {
      return live;
    },
    initialize(detail) {
      pending = clock.schedule(() => {
        pending = null;
        live = true;
        calls.push({ type: "initialize", detail });
      });
    },
    destroy() {
      if (pending !== null) {
        clock.cancel(pending);
        pending = null;
      }
      if (live) {
        live = false;
        calls.push({ type: "destroy" });
      }
    },
  };
}

test("normalizes only the live detail envelope data", () => {
  const detail = normalizeAttendanceDetail({
    ...fullDetail(),
    id_attendance: 999,
    employee: { full_name: "Obsolete root employee" },
    work_hour: "99:99",
    information: "OBSOLETE",
    status: "obsolete-root-status",
  });

  assert.deepEqual(detail.employee, {
    fullName: "Ayu",
    nipNim: "123",
    email: "ayu@test",
    role: "Staff",
    photo: "https://cdn.example.com/users/45/profile.jpg",
    photoUpdatedAt: "2026-08-11T03:00:00.000Z",
    avatar: {
      photoUrl: "https://cdn.example.com/users/45/profile.jpg",
      initials: getInitials("Ayu"),
      avatarColor: getAvatarColor("Ayu"),
    },
  });
  assert.equal(detail.idAttendance, 9);
  assert.equal(detail.attendanceDate, "2026-07-28");
  assert.equal(detail.timeIn, "08:00");
  assert.equal(detail.timeOut, "17:00");
  assert.equal(detail.workHour, "09:00");
  assert.equal(detail.mode, "wfh");
  assert.equal(detail.modeLabel, "WFH");
  assert.equal(detail.status, "ontime");
  assert.equal(detail.statusLabel, "Tepat Waktu");
  assert.equal(detail.notes, "Backend detail");
  assert.equal(detail.bookingId, 77);
  assert.equal(detail.location.latitude, 0);
  assert.equal(detail.location.longitude, 119.8);
  assert.equal(detail.location.radius, null);
  assert.equal(detail.location.description, "");
});

test("attendance detail keeps backend photo evidence separate from avatar presentation", () => {
  const detail = normalizeAttendanceDetail(fullDetail());

  assert.equal(
    detail.employee.photo,
    "https://cdn.example.com/users/45/profile.jpg",
  );
  assert.equal(detail.employee.photoUpdatedAt, "2026-08-11T03:00:00.000Z");
  assert.equal(
    detail.employee.avatar.photoUrl,
    "https://cdn.example.com/users/45/profile.jpg",
  );
  assert.equal(createEmptyAttendanceDetail().employee.avatar.photoUrl, null);
});

test("normalization rejects junk coordinates and never invents detail fields", () => {
  const detail = normalizeAttendanceDetail({
    success: true,
    message: "Detail absensi berhasil diambil",
    data: {
      user: { full_name: "Ayu" },
      location: {
        latitude: "",
        longitude: "invalid",
        radius: "not-a-number",
      },
    },
  });

  assert.equal(detail.employee.fullName, "Ayu");
  assert.equal(detail.employee.email, "");
  assert.equal(detail.notes, "");
  assert.equal(detail.bookingId, null);
  assert.deepEqual(detail.location, {
    latitude: null,
    longitude: null,
    radius: null,
    description: "",
  });
});

test("the empty detail contains no fabricated evidence", () => {
  assert.deepEqual(createEmptyAttendanceDetail(), {
    idAttendance: null,
    employee: {
      fullName: "",
      nipNim: "",
      email: "",
      role: "",
      photo: null,
      photoUpdatedAt: null,
      avatar: {
        photoUrl: null,
        initials: "??",
        avatarColor: getAvatarColor(""),
      },
    },
    attendanceDate: "",
    timeIn: "",
    timeOut: "",
    workHour: "",
    mode: "",
    modeLabel: "",
    status: "",
    statusLabel: "",
    notes: "",
    bookingId: null,
    location: {
      latitude: null,
      longitude: null,
      radius: null,
      description: "",
    },
  });
});

test("a detail without complete coordinates initializes no map", () => {
  const adapter = createMapAdapter();
  const lifecycle = createAttendanceDetailDrawerLifecycle({
    mapAdapter: adapter,
  });

  lifecycle.openShell();
  lifecycle.replace(fullDetail({ location: { latitude: 0, longitude: null } }));

  assert.equal(lifecycle.isOpen, true);
  assert.equal(adapter.calls.length, 0);
});

test("replacing detail destroys the previous map before initializing another", () => {
  const adapter = createMapAdapter();
  const lifecycle = createAttendanceDetailDrawerLifecycle({
    mapAdapter: adapter,
  });

  lifecycle.openShell();
  lifecycle.replace(fullDetail());
  lifecycle.replace(
    fullDetail({
      id_attendance: 10,
      location: { latitude: -0.9, longitude: 119.9 },
    }),
  );

  assert.deepEqual(
    adapter.calls.map((call) => call.type),
    ["initialize", "destroy", "initialize"],
  );
  assert.equal(lifecycle.detail.idAttendance, 10);
});

test("close is idempotent and resets all selected evidence", () => {
  const adapter = createMapAdapter();
  const lifecycle = createAttendanceDetailDrawerLifecycle({
    mapAdapter: adapter,
  });

  lifecycle.openShell();
  lifecycle.replace(fullDetail());
  lifecycle.close();
  lifecycle.close();

  assert.equal(
    adapter.calls.filter((call) => call.type === "destroy").length,
    1,
  );
  assert.equal(lifecycle.isOpen, false);
  assert.deepEqual(lifecycle.detail, createEmptyAttendanceDetail());
});

test("closing before deferred map construction leaves no map", () => {
  const clock = createManualClock();
  const adapter = createDeferredMapAdapter(clock);
  const lifecycle = createAttendanceDetailDrawerLifecycle({
    mapAdapter: adapter,
  });

  lifecycle.openShell();
  lifecycle.replace(fullDetail());
  lifecycle.close();
  clock.flush();

  assert.equal(adapter.live, false);
  assert.deepEqual(adapter.calls, []);
});

function createPresentationHarness() {
  const adapter = createMapAdapter();
  const renderQueue = [];
  const focusCalls = [];
  const trap = {
    activate() {
      focusCalls.push("activate");
    },
    deactivate() {
      focusCalls.push("deactivate");
    },
    handleKeydown(event) {
      focusCalls.push(`keydown:${event.key}`);
    },
  };
  const panel = { id: "attendance-detail-panel" };
  const state = attendanceLogAlpineData({
    browser: null,
    mapAdapter: adapter,
    createFocusTrap(receivedPanel) {
      assert.equal(receivedPanel, panel);
      return trap;
    },
  });
  state.$refs = { attendanceDetailDrawerPanel: panel };
  state.$nextTick = (callback) => renderQueue.push(callback);

  return { state, adapter, renderQueue, focusCalls };
}

test("presentation opens an empty shell and activates focus only after render", () => {
  const { state, renderQueue, focusCalls } = createPresentationHarness();

  state.openAttendanceDrawerShell();

  assert.equal(state.isAttendanceDetailDrawerOpen, true);
  assert.deepEqual(
    state.selectedAttendanceDetail,
    createEmptyAttendanceDetail(),
  );
  assert.deepEqual(focusCalls, []);
  renderQueue.shift()();
  assert.deepEqual(focusCalls, ["activate"]);
});

test("detail replacement waits for the visible map container", () => {
  const { state, adapter, renderQueue } = createPresentationHarness();
  state.openAttendanceDrawerShell();
  renderQueue.shift()();

  state.replaceAttendanceDrawerDetail(fullDetail());

  assert.deepEqual(adapter.calls, []);
  renderQueue.shift()();
  assert.equal(adapter.calls[0].type, "initialize");
  assert.equal(state.selectedAttendanceDetail.idAttendance, 9);
});

test("closing the presentation destroys map work, restores focus, and is idempotent", () => {
  const { state, adapter, renderQueue, focusCalls } =
    createPresentationHarness();
  state.openAttendanceDrawerShell();
  renderQueue.shift()();
  state.replaceAttendanceDrawerDetail(fullDetail());
  renderQueue.shift()();

  state.closeAttendanceDrawer();
  state.closeAttendanceDrawer();

  assert.deepEqual(
    adapter.calls.map((call) => call.type),
    ["initialize", "destroy"],
  );
  assert.deepEqual(focusCalls, ["activate", "deactivate"]);
  assert.equal(state.isAttendanceDetailDrawerOpen, false);
});

test("Tab handling delegates to the active drawer focus trap", () => {
  const { state, renderQueue, focusCalls } = createPresentationHarness();
  state.openAttendanceDrawerShell();
  renderQueue.shift()();

  state.handleAttendanceDrawerTab({ key: "Tab" });

  assert.deepEqual(focusCalls, ["activate", "keydown:Tab"]);
});

test("closing before deferred focus activation leaves no active trap", () => {
  const { state, renderQueue, focusCalls } = createPresentationHarness();
  state.openAttendanceDrawerShell();
  state.closeAttendanceDrawer();

  renderQueue.shift()();

  assert.deepEqual(focusCalls, []);
  assert.equal(state.isAttendanceDetailDrawerOpen, false);
});
