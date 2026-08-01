import {
  firstFiniteMapNumber,
  hasFiniteCoordinates,
} from "../../utils/mapLocationTruth.js";

export function normalizeAttendanceDetail(response = {}) {
  const detail = response?.data ?? {};
  const employee = detail.user ?? {};
  const mode = detail.mode ?? {};
  const status = detail.status ?? {};
  const location = detail.location ?? {};

  return {
    idAttendance: detail.id_attendance ?? null,
    employee: {
      fullName: employee.full_name ?? "",
      nipNim: employee.nip_nim ?? "",
      email: employee.email ?? "",
      role: employee.role ?? "",
    },
    attendanceDate: detail.attendance_date ?? "",
    timeIn: detail.time_in ?? "",
    timeOut: detail.time_out ?? "",
    workHour: detail.work_duration ?? "",
    mode: mode.key ?? "",
    modeLabel: mode.label ?? "",
    status: status.key ?? "",
    statusLabel: status.label ?? "",
    notes: detail.notes ?? "",
    bookingId: detail.booking_id ?? null,
    location: {
      latitude: firstFiniteMapNumber(location.latitude),
      longitude: firstFiniteMapNumber(location.longitude),
      radius: firstFiniteMapNumber(location.radius),
      description: location.description ?? "",
    },
  };
}

export function createEmptyAttendanceDetail() {
  return normalizeAttendanceDetail({});
}

export function createAttendanceDetailDrawerLifecycle({ mapAdapter } = {}) {
  if (!mapAdapter) {
    throw new Error(
      "createAttendanceDetailDrawerLifecycle requires a mapAdapter",
    );
  }

  let isOpen = false;
  let ownsMapWork = false;
  let detail = createEmptyAttendanceDetail();

  function destroyOwnedMap() {
    if (!ownsMapWork) return;
    mapAdapter.destroy();
    ownsMapWork = false;
  }

  function close() {
    if (!isOpen) return;

    destroyOwnedMap();
    detail = createEmptyAttendanceDetail();
    isOpen = false;
  }

  function openShell() {
    close();
    detail = createEmptyAttendanceDetail();
    isOpen = true;
  }

  function replace(nextDetail) {
    if (!isOpen) return false;

    destroyOwnedMap();
    detail = normalizeAttendanceDetail(nextDetail);

    if (hasFiniteCoordinates(detail.location)) {
      mapAdapter.initialize({
        ...detail.location,
        fullName: detail.employee.fullName,
      });
      ownsMapWork = true;
    }

    return true;
  }

  return {
    openShell,
    replace,
    close,
    get isOpen() {
      return isOpen;
    },
    get detail() {
      return detail;
    },
  };
}
