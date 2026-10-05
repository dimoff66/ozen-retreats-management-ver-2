'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Guest, House, Room, TaxiGuest, TaxiRide } from "@/services/database";
import dateService from "@/services/dateService";
import guestsService from "@/services/guestsService";
import housesService from "@/services/housesService";
import roomsService from "@/services/roomsService";
import taxiRidesService from "@/services/taxiRidesService";

type TaxiRidesPanelProps = {
  retreatId: number;
  canManage: boolean;
};

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
};

export default function TaxiRidesPanel({ retreatId, canManage }: TaxiRidesPanelProps) {
  const strTitle = "Taxi rides";
  const strLoading = "Loading...";
  const strNoRides = "No taxi rides yet.";
  const strUnknown = "-";
  const strAddRide = "Add taxi ride";
  const strEditRide = "Edit";
  const strArrival = "Arrival date and time";
  const strDriverName = "Driver name";
  const strSaveRide = "Save ride";
  const strCreateRide = "Create ride";
  const strDeleteRide = "Delete";
  const strCancel = "Cancel";
  const strRideNumber = "Taxi";
  const strPassengers = "Passengers";
  const strGuest = "Guest";
  const strName = "Name";
  const strRoom = "Room";
  const strRemove = "Remove";
  const strSearchGuests = "Search guests";
  const strNoMatchingGuests = "No matching guests.";
  const strNoPassengers = "No passengers assigned.";
  const strAdditionalPassenger = "Or additional passenger";
  const strAddPassenger = "Add passenger";
  const strSelectRide = "Select a taxi to view its passengers.";
  const strPassengerCount = "guests";
  const strMoveGuestConfirm = "Move this guest from the other taxi to the selected taxi?";
  const strLoadRideError = "Failed to load taxi rides.";
  const strSaveError = "Failed to save taxi ride.";
  const strDeleteConfirm = "Delete this taxi ride?";
  const strDeleteError = "Failed to delete taxi ride.";
  const strAddPassengerError = "Enter an additional passenger name.";
  const strSavePassengerError = "Failed to add taxi passenger.";
  const strRemovePassengerError = "Failed to remove taxi passenger.";
  const strArrivalRequired = "Choose the arrival date and time.";
  const [rides, setRides] = useState<TaxiRide[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [taxiGuests, setTaxiGuests] = useState<TaxiGuest[]>([]);
  const [selectedRide, setSelectedRide] = useState<TaxiRide | null>(null);
  const [rideBeingEdited, setRideBeingEdited] = useState<TaxiRide | null>(null);
  const [arrivalDateTime, setArrivalDateTime] = useState("");
  const [driverName, setDriverName] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [extraPassengerName, setExtraPassengerName] = useState("");
  const [isRideModalOpen, setIsRideModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRides = async (preferredRideId?: number) => {
    try {
      const [rideData, guestData, houseData, roomData] = await Promise.all([
        taxiRidesService.getByRetreatId(retreatId),
        guestsService.getGuestsByRetreatId(retreatId),
        housesService.getHouses(),
        roomsService.getRooms(),
      ]);
      const sortedRideData = [...rideData].sort((left, right) => {
        const timeDifference = Date.parse(left.arrival_datetime) - Date.parse(right.arrival_datetime);

        return timeDifference || left.id - right.id;
      });
      const taxiGuestData = await taxiRidesService.getGuestsByRideIds(
        sortedRideData.map((ride) => ride.id)
      );

      setRides(sortedRideData);
      setGuests(guestData);
      setHouses(houseData);
      setRooms(roomData);
      setTaxiGuests(taxiGuestData);
      const rideToKeep = preferredRideId ?? selectedRide?.id;
      const nextRide = sortedRideData.find((ride) => ride.id === rideToKeep)
        ?? sortedRideData[0]
        ?? null;
      setSelectedRide(nextRide);
      setError("");
    } catch {
      setError(strLoadRideError);
    } finally {
      setIsLoading(false);
    }
  };

  const onArrivalChange = (event: ChangeEvent<HTMLInputElement>) => {
    setArrivalDateTime(event.target.value);
  };

  const onDriverNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDriverName(event.target.value);
  };

  const onGuestSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGuestSearch(event.target.value);
  };

  const onExtraPassengerNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExtraPassengerName(event.target.value);
  };

  const onRideSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!arrivalDateTime) {
      setError(strArrivalRequired);
      return;
    }

    setError("");

    try {
      const ride = rideBeingEdited
        ? await taxiRidesService.update(rideBeingEdited.id, {
            arrival_datetime: new Date(arrivalDateTime).toISOString(),
            driver_name: driverName.trim() || null,
          })
        : await taxiRidesService.create({
            retreat_id: retreatId,
            arrival_datetime: new Date(arrivalDateTime).toISOString(),
            driver_name: driverName.trim() || null,
          });

      setSelectedRide(ride);
  setRideBeingEdited(null);
      setIsRideModalOpen(false);
      await loadRides(ride.id);
    } catch {
      setError(strSaveError);
    }
  };

  const onNewRideClick = () => {
    setRideBeingEdited(null);
    setArrivalDateTime("");
    setDriverName("");
    setError("");
    setIsRideModalOpen(true);
  };

  const onEditRideClick = (ride: TaxiRide) => {
    setSelectedRide(ride);
    setRideBeingEdited(ride);
    setArrivalDateTime(toLocalDateTimeInput(ride.arrival_datetime));
    setDriverName(ride.driver_name ?? "");
    setError("");
    setIsRideModalOpen(true);
  };

  const onRideSelect = (ride: TaxiRide) => {
    setSelectedRide(ride);
    setGuestSearch("");
  };

  const onDeleteRideClick = async () => {
    if (!rideBeingEdited || !window.confirm(strDeleteConfirm)) {
      return;
    }

    setError("");

    try {
      await taxiRidesService.delete(rideBeingEdited.id);
      setSelectedRide((current) => current?.id === rideBeingEdited.id ? null : current);
      setRideBeingEdited(null);
      setIsRideModalOpen(false);
      setArrivalDateTime("");
      setDriverName("");
      await loadRides();
    } catch {
      setError(strDeleteError);
    }
  };

  const onPassengerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRide) {
      return;
    }

    const name = extraPassengerName.trim();

    if (!name) {
      setError(strAddPassengerError);
      return;
    }

    setError("");

    try {
      await taxiRidesService.addGuest({
        ride_id: selectedRide.id,
        guest_id: null,
        unbooked_guest_name: name,
      });
      setExtraPassengerName("");
      await loadRides(selectedRide.id);
    } catch {
      setError(strSavePassengerError);
    }
  };

  const onGuestSelect = async (guest: Guest) => {
    if (!selectedRide) {
      return;
    }

    const existingAssignment = taxiGuests.find((passenger) => passenger.guest_id === guest.id);

    if (existingAssignment) {
      const assignedRide = rides.find((ride) => ride.id === existingAssignment.ride_id);
      const assignedRideNumber = rides.findIndex((ride) => ride.id === assignedRide?.id) + 1;

      if (!window.confirm(strMoveGuestConfirm.replace("other taxi", `${strRideNumber} ${assignedRideNumber}`))) {
        return;
      }

      try {
        await taxiRidesService.moveGuest(existingAssignment.id, selectedRide.id);
      } catch {
        setError(strSavePassengerError);
        return;
      }
    } else {
      try {
        await taxiRidesService.addGuest({
          ride_id: selectedRide.id,
          guest_id: guest.id,
          unbooked_guest_name: null,
        });
      } catch {
        setError(strSavePassengerError);
        return;
      }
    }

    setError("");
    setGuestSearch("");
    await loadRides(selectedRide.id);
  };

  const onPassengerDeleteClick = async (passenger: TaxiGuest) => {
    setError("");

    try {
      await taxiRidesService.deleteGuest(passenger.id);
      await loadRides(selectedRide?.id);
    } catch {
      setError(strRemovePassengerError);
    }
  };

  useEffect(() => {
    void loadRides();
  }, [retreatId]);

  const rideRows = rides.map((ride, index) => {
    const assignedPassengers = taxiGuests.filter((passenger) => passenger.ride_id === ride.id);
    const passengerCount = assignedPassengers.length;
    const assignedHouseNames = Array.from(new Set(assignedPassengers.flatMap((passenger) => {
      if (passenger.guest_id === null) {
        return [];
      }

      const guest = guests.find((item) => item.id === passenger.guest_id);
      const room = rooms.find((item) => item.id === guest?.room_id);
      const house = houses.find((item) => item.id === room?.house_id);

      return house ? [house.name] : [];
    }))).sort((left, right) => left.localeCompare(right));
    const houseSummary = assignedHouseNames.length > 0
      ? ` (${assignedHouseNames.join(", ")})`
      : "";

    return {
      id: ride.id,
      number: `${strRideNumber} ${index + 1}`,
      arrival: dateService.formatDateTime(ride.arrival_datetime),
      driverName: ride.driver_name || strUnknown,
      passengerCount: `${passengerCount} ${strPassengerCount}${houseSummary}`,
      isSelected: selectedRide?.id === ride.id,
      onSelect: () => onRideSelect(ride),
      onEdit: () => onEditRideClick(ride),
    };
  });
  const selectedTaxiGuests = selectedRide
    ? taxiGuests.filter((passenger) => passenger.ride_id === selectedRide.id)
    : [];
  const passengerRows = selectedTaxiGuests.map((passenger) => {
    const matchedGuest = guests.find((guest) => guest.id === passenger.guest_id);
    const name = matchedGuest?.name ?? passenger.unbooked_guest_name ?? strGuest;
    const room = matchedGuest?.room_id
      ? rooms.find((item) => item.id === matchedGuest.room_id)
      : undefined;
    const house = room ? houses.find((item) => item.id === room.house_id) : undefined;
    const roomName = room && house
      ? roomsService.getRoomDisplayName(room, house)
      : strUnknown;
    const onRemoveClick = () => {
      void onPassengerDeleteClick(passenger);
    };

    return {
      id: passenger.id,
      name,
      roomName,
      onRemoveClick,
    };
  }).sort((left, right) => left.roomName.localeCompare(right.roomName)
    || left.name.localeCompare(right.name));
  const selectedGuestIds = selectedTaxiGuests.flatMap((passenger) =>
    passenger.guest_id === null ? [] : [passenger.guest_id]
  );
  const normalizedGuestSearch = guestSearch.trim().toLocaleLowerCase();
  const availableGuestRows = guests
    .filter((guest) => !selectedGuestIds.includes(guest.id))
    .filter((guest) => guest.name.toLocaleLowerCase().includes(normalizedGuestSearch))
    .map((guest) => {
      const assignment = taxiGuests.find((passenger) => passenger.guest_id === guest.id);
      const assignedRideIndex = assignment
        ? rides.findIndex((ride) => ride.id === assignment.ride_id)
        : -1;

      return {
        id: guest.id,
        name: guest.name,
        assignmentLabel: assignedRideIndex >= 0
          ? `(${strRideNumber} ${assignedRideIndex + 1})`
          : "",
        onSelect: () => void onGuestSelect(guest),
      };
    });
  const rideSubmitLabel = rideBeingEdited ? strSaveRide : strCreateRide;
  const hasNoRides = rides.length === 0;
  const hasPassengerRows = passengerRows.length > 0;
  const hasAvailableGuestRows = availableGuestRows.length > 0;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{strTitle}</h2>
      {error ? <p role="alert" className="mb-4 text-red-600">{error}</p> : null}
      {isLoading ? <p>{strLoading}</p> : null}
      {!isLoading ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              {rideRows.map((ride) => (
                <article key={ride.id} className={ride.isSelected
                  ? "flex min-w-56 items-stretch rounded-md border border-blue-500 bg-blue-50"
                  : "flex min-w-56 items-stretch rounded-md border border-gray-200 bg-white"}>
                  <button type="button" onClick={ride.onSelect} aria-pressed={ride.isSelected} className="flex min-w-0 flex-1 flex-col items-start p-3 text-left">
                    <span className="text-xs font-bold uppercase text-gray-500">{ride.number}</span>
                    <span className="mt-1 font-semibold">{ride.arrival}</span>
                    <span className="mt-1 text-sm text-gray-700">{ride.driverName}</span>
                    <span className="mt-1 text-xs text-gray-500">{ride.passengerCount}</span>
                  </button>
                  {canManage ? (
                    <button type="button" onClick={ride.onEdit} className="self-start px-3 py-2 text-sm font-medium text-blue-700 hover:underline">
                      {strEditRide}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
            {canManage ? (
              <button type="button" onClick={onNewRideClick} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                {strAddRide}
              </button>
            ) : null}
          </div>
          {hasNoRides ? <p className="mt-4 text-gray-600">{strNoRides}</p> : null}
          {selectedRide ? (
            <section className="mt-6">
              <h3 className="mb-3 font-semibold">{strPassengers}</h3>
              <div className="max-w-2xl overflow-hidden rounded-md border border-gray-200">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-sm text-gray-600">
                    <tr>
                      <th className="px-3 py-2">{strName}</th>
                      <th className="w-28 px-3 py-2">{strRoom}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengerRows.map((passenger) => (
                      <tr key={passenger.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {canManage ? (
                              <button
                                type="button"
                                onClick={passenger.onRemoveClick}
                                aria-label={`${strRemove} ${passenger.name}`}
                                title={strRemove}
                                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-red-300 text-sm leading-none text-red-600 hover:bg-red-50"
                              >
                                ×
                              </button>
                            ) : null}
                            <span>{passenger.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600" title={passenger.roomName}>
                          {passenger.roomName.slice(0, 8)}
                        </td>
                      </tr>
                    ))}
                    {!hasPassengerRows ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-3 text-sm text-gray-500">{strNoPassengers}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {canManage ? (
                <div className="mt-5 max-w-2xl border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium">
                    {strSearchGuests}
                    <input type="search" value={guestSearch} onChange={onGuestSearchChange} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                  </label>
                  <div className="mt-2 divide-y divide-gray-100 border-y border-gray-100">
                    {availableGuestRows.map((guest) => (
                      <button key={guest.id} type="button" onClick={guest.onSelect} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-gray-50">
                        <span>{guest.name}</span>
                        {guest.assignmentLabel ? <span className="shrink-0 text-sm text-gray-500">{guest.assignmentLabel}</span> : null}
                      </button>
                    ))}
                    {!hasAvailableGuestRows ? <p className="py-3 text-sm text-gray-500">{strNoMatchingGuests}</p> : null}
                  </div>
                  <form onSubmit={onPassengerSubmit} className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="min-w-52 flex-1 text-sm font-medium">
                      {strAdditionalPassenger}
                      <input value={extraPassengerName} onChange={onExtraPassengerNameChange} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                    </label>
                    <button type="submit" className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100">
                      {strAddPassenger}
                    </button>
                  </form>
                </div>
              ) : null}
            </section>
          ) : !hasNoRides ? <p className="mt-6 text-gray-600">{strSelectRide}</p> : null}
        </>
      ) : null}
      {isRideModalOpen && canManage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="taxi-ride-dialog-title" className="w-full max-w-lg rounded-md bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 id="taxi-ride-dialog-title" className="text-lg font-bold">{rideSubmitLabel}</h3>
            </div>
            <form onSubmit={onRideSubmit} className="space-y-4 p-5">
              <label className="block text-sm font-medium">
                {strArrival}
                <input type="datetime-local" value={arrivalDateTime} onChange={onArrivalChange} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {strDriverName}
                <input value={driverName} onChange={onDriverNameChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-4">
                <div>
                  {rideBeingEdited ? (
                    <button type="button" onClick={onDeleteRideClick} className="rounded-md border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50">
                      {strDeleteRide}
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsRideModalOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
                    {strCancel}
                  </button>
                  <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                    {rideSubmitLabel}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
