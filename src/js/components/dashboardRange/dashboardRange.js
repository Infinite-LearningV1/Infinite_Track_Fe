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

  return {
    period,
  };
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
