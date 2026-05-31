export function coerceFiniteMapNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function firstFiniteMapNumber(...values) {
  for (const value of values) {
    const number = coerceFiniteMapNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}

export function hasFiniteCoordinates(location) {
  return (
    Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
  );
}
