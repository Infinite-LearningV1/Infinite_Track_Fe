import {
  createDefaultDashboardRange,
  DASHBOARD_RANGE_PERIODS,
  resolveDashboardRangeDateWindow,
  validateDashboardRange,
} from "./dashboardRange.js";

const DATE_PICKER_PLACEHOLDER = "Select dates";
const DROPDOWN_DEFAULT_LABEL = "Pilih Priode";
const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function createDashboardAnalyticsPresetOptions() {
  return [
    { value: DASHBOARD_RANGE_PERIODS.TODAY, label: "Hari ini" },
    { value: DASHBOARD_RANGE_PERIODS.CURRENT_WEEK, label: "7 Hari" },
    { value: DASHBOARD_RANGE_PERIODS.CURRENT_MONTH, label: "Bulan ini" },
  ];
}

export function createDashboardAnalyticsHeaderState(
  rangeState = createDefaultDashboardRange(),
  now = new Date(),
) {
  return {
    isDropdownOpen: false,
    pendingPeriod: rangeState.period,
    selectedLabel: resolveDashboardAnalyticsSelectedLabel(
      rangeState.period,
      rangeState,
      now,
    ),
    customFrom: rangeState.from,
    customTo: rangeState.to,
    pickerInputValue: buildDashboardAnalyticsRangeDisplayValue(rangeState, now),
    pickerPlaceholder: DATE_PICKER_PLACEHOLDER,
    pickerInstance: null,
  };
}

export function applyDashboardAnalyticsPreset(
  period,
  currentRange = createDefaultDashboardRange(),
) {
  if (period === DASHBOARD_RANGE_PERIODS.CUSTOM) {
    return {
      period,
      from: currentRange.from,
      to: currentRange.to,
    };
  }

  return {
    period,
    from: null,
    to: null,
  };
}

export function applyDashboardAnalyticsCustomRange({ from, to }) {
  const nextRange = {
    period: DASHBOARD_RANGE_PERIODS.CUSTOM,
    from,
    to,
  };

  return {
    nextRange,
    validation: validateDashboardRange(nextRange),
  };
}

export function syncDashboardAnalyticsHeaderState(
  headerState,
  rangeState,
  now = new Date(),
) {
  return {
    ...headerState,
    pendingPeriod: rangeState.period,
    selectedLabel: resolveDashboardAnalyticsSelectedLabel(
      rangeState.period,
      rangeState,
      now,
    ),
    customFrom: rangeState.from,
    customTo: rangeState.to,
    pickerInputValue: buildDashboardAnalyticsRangeDisplayValue(rangeState, now),
  };
}

export function buildDashboardAnalyticsRangeDisplayValue(
  rangeState,
  now = new Date(),
) {
  const { from, to } = resolveDashboardAnalyticsDateWindow(rangeState, now);
  if (!from || !to) {
    return DATE_PICKER_PLACEHOLDER;
  }

  return `${formatIsoDateForDisplay(from)} - ${formatIsoDateForDisplay(to)}`;
}

export function resolveDashboardAnalyticsDateWindow(
  rangeState,
  now = new Date(),
) {
  if (rangeState.period === DASHBOARD_RANGE_PERIODS.CUSTOM) {
    return {
      from: rangeState.from,
      to: rangeState.to,
    };
  }

  try {
    return resolveDashboardRangeDateWindow(rangeState, { now });
  } catch {
    return {
      from: null,
      to: null,
    };
  }
}

export function resolveDashboardAnalyticsSelectedLabel(
  period,
  rangeState = createDefaultDashboardRange(),
  now = new Date(),
) {
  if (period === DASHBOARD_RANGE_PERIODS.CUSTOM) {
    const displayValue = buildDashboardAnalyticsRangeDisplayValue(
      rangeState,
      now,
    );

    return displayValue === DATE_PICKER_PLACEHOLDER
      ? DROPDOWN_DEFAULT_LABEL
      : displayValue;
  }

  const selectedOption = createDashboardAnalyticsPresetOptions().find(
    (option) => option.value === period,
  );

  return selectedOption?.label || DROPDOWN_DEFAULT_LABEL;
}

export function connectDashboardAnalyticsDatePicker(
  element,
  { rangeState, onReady, onRangeApply, onInvalid },
) {
  if (!element) {
    return null;
  }

  const bindPickerInstance = () => {
    const instance = element._flatpickr;
    if (!instance) {
      scheduleRetry(bindPickerInstance);
      return null;
    }

    if (element.dataset.dashboardAnalyticsPickerBound === "true") {
      syncDashboardAnalyticsDatePickerElement(element, rangeState);
      onReady?.(instance);
      return instance;
    }

    element.dataset.dashboardAnalyticsPickerBound = "true";
    ensureHookArray(instance, "onOpen").push(() => {
      syncDashboardAnalyticsDatePickerElement(element, rangeState);
    });
    ensureHookArray(instance, "onChange").push((selectedDates) => {
      if (!Array.isArray(selectedDates) || selectedDates.length < 2) {
        return;
      }

      const [fromDate, toDate] = selectedDates;
      const { nextRange, validation } = applyDashboardAnalyticsCustomRange({
        from: toIsoDate(fromDate),
        to: toIsoDate(toDate),
      });

      if (!validation.isValid) {
        onInvalid?.(validation.message);
        syncDashboardAnalyticsDatePickerElement(element, rangeState);
        return;
      }

      onRangeApply?.(nextRange);
      instance.close();
    });

    syncDashboardAnalyticsDatePickerElement(element, rangeState);
    onReady?.(instance);
    return instance;
  };

  bindPickerInstance();
  return null;
}

export function syncDashboardAnalyticsDatePickerElement(
  element,
  rangeState,
  now = new Date(),
) {
  if (!element) {
    return;
  }

  const { from, to } = resolveDashboardAnalyticsDateWindow(rangeState, now);
  element.value = buildDashboardAnalyticsRangeDisplayValue(rangeState, now);

  const instance = element._flatpickr;
  if (!instance) {
    return;
  }

  if (from && to) {
    instance.setDate([from, to], false, "Y-m-d");
    return;
  }

  instance.clear();
}

export function openDashboardAnalyticsDatePicker(element) {
  element?._flatpickr?.open();
}

function ensureHookArray(instance, hookName) {
  const hook = instance.config[hookName];
  if (Array.isArray(hook)) {
    return hook;
  }

  if (hook) {
    instance.config[hookName] = [hook];
    return instance.config[hookName];
  }

  instance.config[hookName] = [];
  return instance.config[hookName];
}

function formatIsoDateForDisplay(value) {
  const date = parseIsoDate(value);
  if (!date) {
    return value;
  }

  return DISPLAY_DATE_FORMATTER.format(date);
}

function parseIsoDate(value) {
  if (!value) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function scheduleRetry(callback) {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    window.requestAnimationFrame(callback);
    return;
  }

  setTimeout(callback, 0);
}
