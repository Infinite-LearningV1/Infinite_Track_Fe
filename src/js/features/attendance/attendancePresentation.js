const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WORK_DURATION_PATTERN = /^(\d+):([0-5]\d)$/;

const INDONESIAN_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatAttendanceDateLabel(value) {
  if (typeof value !== "string") return "-";
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return "-";

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "-";
  }

  return INDONESIAN_DATE_FORMATTER.format(date);
}

export function formatAttendanceWorkDuration(value) {
  if (typeof value !== "string") return "Durasi tidak tersedia";
  const match = WORK_DURATION_PATTERN.exec(value.trim());
  if (!match) return "Durasi tidak tersedia";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isSafeInteger(hours)) return "Durasi tidak tersedia";

  const parts = [];
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ") || "0m";
}

export function getAttendanceLocationText(location = {}) {
  if (location?.available !== true) return "Lokasi tidak tersedia";
  const description =
    typeof location.description === "string" ? location.description.trim() : "";
  return description || "Lokasi tersedia";
}
