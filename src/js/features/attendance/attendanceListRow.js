import { firstFiniteMapNumber } from "../../utils/mapLocationTruth.js";

/**
 * Normalize the intentionally slim Attendance list projection.
 * Detail-only evidence remains owned by GET /attendance/:id.
 */
export function normalizeAttendanceListRow(row = {}) {
  return {
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
}
