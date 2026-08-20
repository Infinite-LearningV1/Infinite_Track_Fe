function toNumber(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createStatCard(key, title, value, iconPath) {
  return {
    key,
    title,
    value: String(toNumber(value)),
    iconPath,
  };
}

export function createGeofenceEvidenceViewState(panel) {
  const data = panel?.data || {};
  const counts = data.rawCounts || {};
  const totalEvents = toNumber(counts.total_events);
  const uniqueUsers = toNumber(counts.unique_users);
  const authority =
    data.finalAttendanceAuthority ||
    data.final_attendance_authority ||
    "backend attendance records";

  return {
    title: panel?.title || "Geofence Operational Context",
    subtitle: panel?.subtitle || "ENTER / EXIT + attendance evidence",
    isPreview: Boolean(data.isPreview),
    statusLabel:
      data.status === "ready" ? "Active" : panel?.stateLabel || "Active",
    statusTone:
      data.status === "ready" || panel?.state === "ready"
        ? "active"
        : "neutral",
    summaryLead: String(uniqueUsers),
    summaryText: `users generated ${totalEvents} geofence events in this range`,
    sourceLabel: data.source || "analysis.geofence-evidence",
    statCards: [
      createStatCard(
        "enter-events",
        "ENTER Events",
        counts.enter_events,
        "M5 12h10m0 0-3.5-3.5M15 12H5m0 0 3.5 3.5",
      ),
      createStatCard(
        "exit-events",
        "EXIT Events",
        counts.exit_events,
        "M9 8l4 4-4 4M13 12H3m12-7h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4",
      ),
      createStatCard(
        "total-events",
        "Total Events",
        totalEvents,
        "M12 3l7 4v10l-7 4-7-4V7l7-4Zm0 0v18m7-14-7 4-7-4",
      ),
      createStatCard(
        "people-seen",
        "People Seen",
        uniqueUsers,
        "M16 11a4 4 0 1 0-8 0m8 0a4 4 0 0 1-8 0m8 0v1a4 4 0 0 0 4 4h1M8 12a4 4 0 0 0-4 4H3",
      ),
    ],
    notes: [
      {
        key: "enter-support",
        label: "ENTER events support check-in reminder monitoring",
        iconPath:
          "M12 3v4m0 10v4M5.64 5.64l2.83 2.83m7.06 7.06 2.83 2.83M3 12h4m10 0h4M5.64 18.36l2.83-2.83m7.06-7.06 2.83-2.83",
      },
      {
        key: "exit-support",
        label: "EXIT events support active-session exit warning monitoring",
        iconPath:
          "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
      },
      {
        key: "truth-boundary",
        label: `Location context only · final attendance validity remains determined by ${authority}`,
        iconPath: "M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z",
      },
    ],
  };
}
