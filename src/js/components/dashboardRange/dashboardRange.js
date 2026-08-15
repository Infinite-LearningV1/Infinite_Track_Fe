export const DASHBOARD_RANGE_PERIODS = {
  TODAY: "today",
  CURRENT_WEEK: "current_week",
  CURRENT_MONTH: "current_month",
  CUSTOM: "custom",
};

const ALLOWED_PERIODS = new Set(Object.values(DASHBOARD_RANGE_PERIODS));
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createDefaultDashboardRange() {
  return {
    period: DASHBOARD_RANGE_PERIODS.CURRENT_MONTH,
    from: null,
    to: null,
  };
}

export function validateDashboardRange({ period, from, to }) {
  if (!ALLOWED_PERIODS.has(period)) {
    return {
      isValid: false,
      message: "Invalid period",
    };
  }

  if (period !== DASHBOARD_RANGE_PERIODS.CUSTOM) {
    return {
      isValid: true,
      message: "",
    };
  }

  if (!from || !to) {
    return {
      isValid: false,
      message: "Custom period requires both from and to dates",
    };
  }

  if (!isValidDateFormat(from) || !isValidDateFormat(to)) {
    return {
      isValid: false,
      message: "Invalid date format",
    };
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (!fromDate || !toDate) {
    return {
      isValid: false,
      message: "Invalid date format",
    };
  }

  if (toDate < fromDate) {
    return {
      isValid: false,
      message: "To date must be on or after from date",
    };
  }

  const selectedDays = Math.floor((toDate - fromDate) / MS_PER_DAY) + 1;
  if (selectedDays > 31) {
    return {
      isValid: false,
      message: "Date range cannot exceed 31 days",
    };
  }

  return {
    isValid: true,
    message: "",
  };
}

export function buildDashboardRangeRequestParams({ period, from, to }) {
  if (period === DASHBOARD_RANGE_PERIODS.CUSTOM) {
    return {
      period,
      from,
      to,
    };
  }

  if (period === DASHBOARD_RANGE_PERIODS.TODAY) {
    return {
      period: "daily",
    };
  }

  if (period === DASHBOARD_RANGE_PERIODS.CURRENT_WEEK) {
    return {
      period: "weekly",
    };
  }

  return {
    period,
  };
}

export function resolveDashboardRangeDateWindow(
  rangeState,
  { today = new Date().toISOString().slice(0, 10) } = {},
) {
  const normalizedRange = {
    ...createDefaultDashboardRange(),
    ...(rangeState || {}),
  };
  const validation = validateDashboardRange(normalizedRange);

  if (!validation.isValid) {
    throw new Error(validation.message || "Invalid dashboard date range");
  }

  if (!isValidDateFormat(today)) {
    throw new Error("Invalid today date");
  }

  switch (normalizedRange.period) {
    case DASHBOARD_RANGE_PERIODS.TODAY:
      return { from: today, to: today };
    case DASHBOARD_RANGE_PERIODS.CURRENT_WEEK: {
      const end = parseDate(today);
      const start = new Date(end.getTime() - 6 * MS_PER_DAY);
      return { from: formatDate(start), to: today };
    }
    case DASHBOARD_RANGE_PERIODS.CURRENT_MONTH: {
      const end = parseDate(today);
      const start = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1),
      );
      return { from: formatDate(start), to: today };
    }
    case DASHBOARD_RANGE_PERIODS.CUSTOM:
      return { from: normalizedRange.from, to: normalizedRange.to };
    default:
      throw new Error("Invalid dashboard range period");
  }
}

function isValidDateFormat(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  return Boolean(parseDate(value));
}

function parseDate(value) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
