'use client';

import { useEffect, useState } from "react";
import type { Guest, House, Room, TaxiGuest, TaxiRide } from "@/services/database";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import dateService from "@/services/dateService";
import guestStatusesService from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import housesService from "@/services/housesService";
import roomsService from "@/services/roomsService";
import taxiRidesService from "@/services/taxiRidesService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

type ManagerArrivalPanelProps = {
  retreatId: number;
  mode: "meeting" | "check-in";
};

type GuestRow = {
  guest: Guest;
  roomName: string;
  houseName: string;
  taxiNumber: string;
  status: GuestStatusValue;
};

export default function ManagerArrivalPanel({ retreatId, mode }: ManagerArrivalPanelProps) {
  const strTitle = mode === "meeting" ? "Meeting" : "Check in";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load meeting data.";
  const strStatusError = "Failed to update guest status.";
  const strNoRides = "No taxi rides for this retreat.";
  const strChooseRides = "Select taxis to see their guests.";
  const strNoGuests = mode === "meeting" ? "No guests assigned to selected taxis." : "No guests have arrived yet.";
  const strTaxi = "Taxi";
  const strDriver = "Driver";
  const strPassengers = "guests";
  const strRoomUnknown = "-";
  const strNoHouse = "No assigned house";
  const strNoTaxi = "No taxi assigned";
  const strArrived = "Arrived";
  const strCheckIn = "Check in";
  const strCheckedIn = "Checked in";
  const { currentUser } = useCurrentUser();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rides, setRides] = useState<TaxiRide[]>([]);
  const [taxiGuests, setTaxiGuests] = useState<TaxiGuest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [statuses, setStatuses] = useState<Map<number, GuestStatusValue>>(new Map());
  const [selectedRideIds, setSelectedRideIds] = useState<Set<number>>(new Set());
  const [pendingGuestIds, setPendingGuestIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    void Promise.all([
      guestsService.getGuestsByRetreatId(retreatId),
      taxiRidesService.getByRetreatId(retreatId),
      housesService.getHouses(),
      roomsService.getRooms(),
      guestStatusesService.getLatestForRetreat(retreatId),
    ])
      .then(async ([guestData, rideData, houseData, roomData, latestStatuses]) => {
        const sortedRides = [...rideData].sort((left, right) => {
          const timeDifference = Date.parse(left.arrival_datetime) - Date.parse(right.arrival_datetime);

          return timeDifference || left.id - right.id;
        });
        const taxiGuestData = await taxiRidesService.getGuestsByRideIds(
          sortedRides.map((ride) => ride.id)
        );

        if (isCancelled) {
          return;
        }

        setGuests(guestData);
        setRides(sortedRides);
        setTaxiGuests(taxiGuestData);
        setHouses(houseData);
        setRooms(roomData);
        setStatuses(new Map(Array.from(latestStatuses, ([guestId, status]) => [guestId, status.status])));
        setError("");
      })
      .catch(() => {
        if (!isCancelled) {
          setError(strLoadError);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [retreatId]);

  const onRideToggle = (rideId: number) => {
    setSelectedRideIds((current) => {
      const next = new Set(current);

      if (next.has(rideId)) {
        next.delete(rideId);
      } else {
        next.add(rideId);
      }

      return next;
    });
  };

  const onGuestStatusAction = async (
    guestRow: GuestRow,
    nextStatus: Extract<GuestStatusValue, "arrived" | "checked_in">
  ) => {
    if (!currentUser || pendingGuestIds.has(guestRow.guest.id)) {
      return;
    }

    const currentStatus = statuses.get(guestRow.guest.id) ?? "booked";

    if (nextStatus === "arrived" && currentStatus !== "booked") {
      return;
    }

    if (nextStatus === "checked_in" && currentStatus !== "arrived") {
      return;
    }

    setPendingGuestIds((current) => new Set(current).add(guestRow.guest.id));
    setError("");

    try {
      await guestStatusesService.createStatus(
        guestRow.guest.id,
        nextStatus,
        guestRow.roomName === strRoomUnknown ? null : guestRow.roomName,
        currentUser.id
      );
      setStatuses((current) => new Map(current).set(guestRow.guest.id, nextStatus));
    } catch {
      setError(strStatusError);
    } finally {
      setPendingGuestIds((current) => {
        const next = new Set(current);
        next.delete(guestRow.guest.id);
        return next;
      });
    }
  };

  const rideRows = rides.map((ride, index) => {
    const rideGuestAssignments = taxiGuests.filter((taxiGuest) => taxiGuest.ride_id === ride.id);
    const passengerCount = rideGuestAssignments.length;
    const isSelected = selectedRideIds.has(ride.id);

    return {
      id: ride.id,
      number: `${strTaxi} ${index + 1}`,
      arrival: dateService.formatDateTime(ride.arrival_datetime),
      driver: ride.driver_name || strDriver,
      passengerCount: `${passengerCount} ${strPassengers}`,
      isSelected,
      onChange: () => onRideToggle(ride.id),
    };
  });
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const houseById = new Map(houses.map((house) => [house.id, house]));
  const taxiNumberById = new Map(rides.map((ride, index) => [ride.id, `${strTaxi} ${index + 1}`]));
  const meetingGuestIds = new Set(taxiGuests
    .filter((taxiGuest) => selectedRideIds.has(taxiGuest.ride_id) && taxiGuest.guest_id !== null)
    .flatMap((taxiGuest) => taxiGuest.guest_id === null ? [] : [taxiGuest.guest_id]));
  const visibleGuests = mode === "meeting"
    ? guests.filter((guest) => meetingGuestIds.has(guest.id))
    : guests.filter((guest) => {
        const status = statuses.get(guest.id) ?? "booked";
        return status === "arrived" || status === "checked_in";
      });
  const guestRows = visibleGuests.map((guest): GuestRow => {
    const room = guest.room_id === null ? undefined : roomById.get(guest.room_id);
    const house = room ? houseById.get(room.house_id) : undefined;
    const roomName = room && house
      ? roomsService.getRoomDisplayName(room, house)
      : strRoomUnknown;
    const taxiAssignment = taxiGuests.find((taxiGuest) => taxiGuest.guest_id === guest.id);

    return {
      guest,
      roomName,
      houseName: house?.name ?? strNoHouse,
      taxiNumber: taxiAssignment
        ? taxiNumberById.get(taxiAssignment.ride_id) ?? strNoTaxi
        : strNoTaxi,
      status: statuses.get(guest.id) ?? "booked",
    };
  }).sort((left, right) => left.houseName.localeCompare(right.houseName)
    || left.roomName.localeCompare(right.roomName)
    || left.guest.name.localeCompare(right.guest.name));
  const guestCardRows = guestRows.map((guestRow) => {
    const actionStatus = mode === "meeting" && guestRow.status === "booked"
      ? "arrived"
      : mode === "check-in" && guestRow.status === "arrived"
        ? "checked_in"
        : null;
    const actionLabel = actionStatus === "arrived"
      ? strArrived
      : actionStatus === "checked_in"
        ? strCheckIn
        : guestRow.status === "checked_in"
          ? strCheckedIn
          : "";

    return {
      ...guestRow,
      actionStatus,
      actionLabel,
      isPending: pendingGuestIds.has(guestRow.guest.id),
      onAction: () => {
        if (actionStatus) {
          void onGuestStatusAction(guestRow, actionStatus);
        }
      },
    };
  });
  const guestGroups: { houseName: string; rows: typeof guestCardRows }[] = [];

  guestCardRows.forEach((row) => {
    const existingGroup = guestGroups.find((group) => group.houseName === row.houseName);

    if (existingGroup) {
      existingGroup.rows.push(row);
      return;
    }

    guestGroups.push({ houseName: row.houseName, rows: [row] });
  });
  const hasRideRows = rideRows.length > 0;
  const hasGuestRows = guestCardRows.length > 0;
  const hasSelectedRides = selectedRideIds.size > 0;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{strTitle}</h2>
      {error ? <p role="alert" className="mb-4 text-red-600">{error}</p> : null}
      {isLoading ? <p>{strLoading}</p> : null}
      {!isLoading && mode === "meeting" ? (
        <>
          <div className="flex flex-wrap gap-3">
            {rideRows.map((ride) => (
              <label key={ride.id} className={ride.isSelected
                ? "flex min-w-56 cursor-pointer items-start gap-3 rounded-md border border-blue-500 bg-blue-50 p-3"
                : "flex min-w-56 cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-white p-3"}>
                <input type="checkbox" checked={ride.isSelected} onChange={ride.onChange} className="mt-1 size-4 accent-blue-600" />
                <span className="flex flex-col">
                  <span className="text-xs font-bold uppercase text-gray-500">{ride.number}</span>
                  <span className="mt-1 font-semibold">{ride.arrival}</span>
                  <span className="mt-1 text-sm text-gray-700">{ride.driver}</span>
                  <span className="mt-1 text-xs text-gray-500">{ride.passengerCount}</span>
                </span>
              </label>
            ))}
          </div>
          {!hasRideRows ? <p className="mt-4 text-gray-600">{strNoRides}</p> : null}
          {hasRideRows && !hasSelectedRides ? <p className="mt-4 text-gray-600">{strChooseRides}</p> : null}
        </>
      ) : null}
      {!isLoading && (mode === "check-in" || hasSelectedRides) ? (
        <div className="mt-5 space-y-5">
          {guestGroups.map((group) => (
            <section key={group.houseName}>
              <h3 className="mb-2 text-sm font-semibold text-gray-500">{group.houseName}</h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.rows.map((row) => (
                  <article key={row.guest.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.guest.name}</p>
                      <p className="mt-1 text-sm text-gray-600">{row.roomName}</p>
                      <p className="mt-1 text-xs text-gray-500">{row.taxiNumber}</p>
                    </div>
                    {row.actionStatus ? (
                      <button type="button" onClick={row.onAction} disabled={row.isPending} className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {row.actionLabel}
                      </button>
                    ) : row.actionLabel ? (
                      <span className="shrink-0 text-sm font-medium text-green-700">{row.actionLabel}</span>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!hasGuestRows ? <p className="text-gray-600">{strNoGuests}</p> : null}
        </div>
      ) : null}
    </section>
  );
}