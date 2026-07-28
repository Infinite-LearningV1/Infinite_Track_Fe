import { firstFiniteMapNumber } from "../../utils/mapLocationTruth.js";

/**
 * Normalize the intentionally slim Attendance list projection.
 * Detail-only evidence remains owned by GET /attendance/:id.
 */
export function normalizeAttendanceListRow(row = {}) {
  const normalized = {
    idAttendance: row.id_attendance ?? null,
    employeeId: row.id ?? null,
    fullName: row.full_name ?? "",
    nipNim: row.nip_nim ?? "",
    roleName: row.role_name ?? "",
    attendanceDate: row.attendance_date ?? "",
    timeIn: row.time_in ?? "",
    timeOut: row.time_out ?? "",
    workHour: row.work_hour ?? "",
    mode: row.mode ?? row.information ?? "",
    status: row.status ?? "",
    checkoutState: row.checkout_state ?? "",
    location: {
      latitude: firstFiniteMapNumber(row.location?.latitude, row.latitude),
      longitude: firstFiniteMapNumber(row.location?.longitude, row.longitude),
    },
  };

  // Temporary non-enumerable aliases keep the INF-268 table functional until
  // Task 5 moves the template to the canonical camel-case list projection.
  Object.defineProperties(normalized, {
    id_attendance: { get: () => normalized.idAttendance },
    id: { get: () => normalized.employeeId },
    full_name: { get: () => normalized.fullName },
    nip_nim: { get: () => normalized.nipNim },
    role_name: { get: () => normalized.roleName },
    attendance_date: { get: () => normalized.attendanceDate },
    time_in: { get: () => normalized.timeIn },
    time_out: { get: () => normalized.timeOut },
    work_hour: { get: () => normalized.workHour },
    information: { get: () => normalized.mode },
    checkout_state: { get: () => normalized.checkoutState },
  });

  return normalized;
}
