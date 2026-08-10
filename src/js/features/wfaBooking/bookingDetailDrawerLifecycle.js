function hasFiniteCoordinates(row = {}) {
  return (
    Number.isFinite(row.location_latitude) &&
    Number.isFinite(row.location_longitude)
  );
}

export function createBookingDetailDrawerLifecycle({ mapAdapter = null } = {}) {
  let ownsMap = false;
  return {
    isOpen: false,
    selectedBooking: null,
    open(booking) {
      if (ownsMap) mapAdapter?.destroy?.();
      this.selectedBooking = booking;
      this.isOpen = true;
      ownsMap = hasFiniteCoordinates(booking);
      if (ownsMap)
        mapAdapter?.initialize?.({
          id: booking.id ?? null,
          latitude: booking.location_latitude,
          longitude: booking.location_longitude,
          radius: booking.radiusSnapshot ?? null,
          description: booking.location_name ?? "",
          fullName: booking.employee_name ?? "",
        });
    },
    close() {
      if (ownsMap) mapAdapter?.destroy?.();
      ownsMap = false;
      this.isOpen = false;
      this.selectedBooking = null;
    },
  };
}
