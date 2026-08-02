/**
 * Normalize the intentionally slim Attendance list projection.
 * Detail-only evidence remains owned by GET /attendance/:id.
 */
export function deriveAttendanceCheckoutState(timeOut) {
  if (timeOut === null) return "open";
  if (typeof timeOut === "string" && timeOut.trim()) return "completed";
  return "";
}

export function getAttendanceCheckoutText(record = {}) {
  if (record.checkoutState === "open") return "Belum checkout";
  if (
    record.checkoutState === "completed" &&
    typeof record.timeOut === "string" &&
    record.timeOut.trim()
  ) {
    return record.timeOut;
  }
  return "-";
}

export function normalizeAttendanceListRow(row = {}) {
  const user = row.user ?? {};
  const mode = row.mode ?? {};
  const status = row.status ?? {};
  const location = row.location ?? {};

  return {
    idAttendance: row.id_attendance ?? null,
    employeeId: user.id ?? null,
    fullName: user.full_name ?? "",
    nipNim: user.nip_nim ?? "",
    roleName: user.role ?? "",
    attendanceDate: row.attendance_date ?? "",
    timeIn: row.time_in ?? "",
    timeOut: row.time_out ?? "",
    workHour: row.work_duration ?? "",
    mode: mode.key ?? "",
    modeLabel: mode.label ?? "",
    status: status.key ?? "",
    statusLabel: status.label ?? "",
    checkoutState: deriveAttendanceCheckoutState(row.time_out),
    location: {
      available: location.available === true,
      id: location.id ?? null,
      description: location.description ?? "",
    },
  };
}
