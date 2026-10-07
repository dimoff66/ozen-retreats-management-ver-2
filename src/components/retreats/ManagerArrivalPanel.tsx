'use client';

import { useState } from "react";
import type { Guest, Room } from "@/services/database";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import type { GuestAction } from "@/services/guestActionsService";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import GuestsCards from "@/components/retreats/GuestsCards";
import type { GuestCardRow } from "@/components/retreats/GuestsCards";
import type { GuestMenuAction } from "@/services/guestsService";
import dateService from "@/services/dateService";
import guestsService from "@/services/guestsService";
import roomsService from "@/services/roomsService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useRetreat } from "@/contexts/RetreatContext";

type ManagerArrivalPanelProps = {
  mode: "meeting" | "check-in";
  showTitle?: boolean;
};

type GuestRow = {
  guest: Guest;
  roomName: string;
  houseName: string;
  houseId: number | null;
  taxiNumber: string;
  status: GuestStatusValue;
};

type ArrivalGuestCardRow = GuestCardRow & Pick<GuestRow, "houseName" | "houseId" | "status">;

export default function ManagerArrivalPanel({ mode, showTitle = true }: ManagerArrivalPanelProps) {
  const strTitle = mode === "meeting" ? "Meeting" : "Check in";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load meeting data.";
  const strStatusError = "Failed to update guest status.";
  const strNoRides = "No taxi rides for this retreat.";
  const strChooseRides = "No taxis selected. Showing all guests.";
  const strNoGuests = "No guests available.";
  const strTaxi = "Taxi";
  const strDriver = "Driver";
  const strPassengers = "guests";
  const strRoomUnknown = "-";
  const strNoHouse = "No assigned house";
  const strNoTaxi = "No taxi assigned";
  const strArrived = "Arrived";
  const strSetArrived = "SET ARRIVED";
  const strCheckIn = "Check in";
  const strCheckedIn = "Checked in";
  const statusLabels: Record<GuestStatusValue, string> = {
    booked: "Booked",
    arrived: strArrived,
    checked_in: strCheckedIn,
    not_coming: "Not coming",
  };
  const { currentUser } = useCurrentUser();
  const {
    snapshot,
    isLoading,
    error: retreatError,
    createStatus,
    updateGuest,
  } = useRetreat();
  const guests = snapshot?.guests ?? [];
  const rides = snapshot?.taxiRides ?? [];
  const taxiGuests = snapshot?.taxiGuests ?? [];
  const rooms = snapshot?.rooms ?? [];
  const houses = snapshot?.houses ?? [];
  const statuses = new Map(
    Array.from(snapshot?.latestStatuses ?? [], ([guestId, status]) => [guestId, status.status])
  );
  const isSnapshotLoading = isLoading || !snapshot;
  const [selectedRideIds, setSelectedRideIds] = useState<Set<number>>(new Set());
  const [pendingGuestIds, setPendingGuestIds] = useState<Set<number>>(new Set());
  const [mapGuest, setMapGuest] = useState<Guest | null>(null);
  const [mapSelectionMode, setMapSelectionMode] = useState<"room" | "guest">("room");
  const [error, setError] = useState("");
  const sortedRides = [...rides].sort((left, right) => {
    const timeDifference = Date.parse(left.arrival_datetime) - Date.parse(right.arrival_datetime);

    return timeDifference || left.id - right.id;
  });

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
    nextStatus: GuestStatusValue
  ) => {
    if (!currentUser || pendingGuestIds.has(guestRow.guest.id)) {
      return;
    }

    const currentStatus = statuses.get(guestRow.guest.id) ?? "booked";

    if (nextStatus === "arrived" && currentStatus !== "booked" && currentStatus !== "checked_in") {
      return;
    }

    if (nextStatus === "checked_in" && currentStatus !== "arrived") {
      return;
    }

    if (nextStatus === "not_coming" && currentStatus !== "booked") {
      return;
    }

    if (nextStatus === "booked" && currentStatus !== "arrived") {
      return;
    }

    setPendingGuestIds((current) => new Set(current).add(guestRow.guest.id));
    setError("");

    try {
      await createStatus(
        guestRow.guest.id,
        nextStatus,
        guestRow.roomName === strRoomUnknown ? null : guestRow.roomName,
        currentUser.id
      );
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

  const onGuestMenuAction = (
    guestRow: GuestRow,
    action: GuestAction
  ) => {
    if (action === "move_room" || action === "swap_room") {
      setMapGuest(guestRow.guest);
      setMapSelectionMode(action === "move_room" ? "room" : "guest");
      return;
    }

    const nextStatus: Partial<Record<GuestAction, GuestStatusValue>> = {
      mark_arrived: "arrived",
      not_coming: "not_coming",
      check_in: "checked_in",
      cancel_check_in: "arrived",
      cancel_arrival: "booked",
    };
    const status = nextStatus[action];

    if (status) {
      void onGuestStatusAction(guestRow, status);
    }
  };

  const onRoomSelectActionClick = async (room: Room) => {
    if (!mapGuest) {
      throw new Error(strStatusError);
    }

    await updateGuest(mapGuest.id, { room_id: room.id });
    setMapGuest(null);
  };

  const onGuestSwapActionClick = async (targetGuest: Guest) => {
    if (!mapGuest?.room_id || !targetGuest.room_id) {
      throw new Error(strStatusError);
    }

    await Promise.all([
      updateGuest(mapGuest.id, { room_id: targetGuest.room_id }),
      updateGuest(targetGuest.id, { room_id: mapGuest.room_id }),
    ]);
    setMapGuest(null);
  };

  const onMapCancelActionClick = () => {
    setMapGuest(null);
  };

  const rideRows = sortedRides.map((ride, index) => {
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
  const guestRows = guests.map((guest): GuestRow => {
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
      houseId: house?.id ?? null,
      taxiNumber: taxiAssignment
        ? taxiNumberById.get(taxiAssignment.ride_id) ?? strNoTaxi
        : strNoTaxi,
      status: statuses.get(guest.id) ?? "booked",
    };
  }).sort((left, right) => (left.houseId ?? Number.MAX_SAFE_INTEGER) - (right.houseId ?? Number.MAX_SAFE_INTEGER)
    || left.roomName.localeCompare(right.roomName)
    || left.guest.name.localeCompare(right.guest.name));
  const guestCardRows: ArrivalGuestCardRow[] = guestRows.map((guestRow) => {
    const menuActions: GuestMenuAction[] = currentUser
      ? guestsService.getGuestMenuActions(
          guestRow.guest,
          currentUser.role,
          guestRow.status,
          (_guest, action) => onGuestMenuAction(guestRow, action)
        )
      : [];

    return {
      ...guestRow,
      statusLabel: statusLabels[guestRow.status],
      statusBadgeClassName: guestRow.status === "checked_in"
        ? "bg-blue-100 text-blue-800"
        : guestRow.status === "arrived"
          ? "bg-green-100 text-green-800"
          : guestRow.status === "not_coming"
            ? "bg-red-100 text-red-800"
            : "bg-gray-100 text-gray-700",
      isPending: pendingGuestIds.has(guestRow.guest.id),
      showStatus: true,
      fallbackCaption: mode === "check-in"
        && guestRow.houseId !== null
        && guestRow.status === "checked_in"
        ? strCheckedIn
        : "",
      menuActions,
    };
  });
  const hasRideRows = rideRows.length > 0;
  const hasSelectedRides = selectedRideIds.size > 0;
  const getGuestCardGroup = (guestRow: ArrivalGuestCardRow) => {
    if (guestRow.houseId === null) {
      return null;
    }

    if (mode === "meeting") {
      if (hasSelectedRides && !meetingGuestIds.has(guestRow.guest.id)) {
        return null;
      }

      return {
        groupLabel: guestRow.houseName,
        groupIndex: guestRow.houseId,
        actionButton: guestRow.status === "booked"
          ? {
              caption: strSetArrived,
              action: () => {
                void onGuestStatusAction(guestRow, "arrived");
              },
            }
          : null,
      };
    }

    if (guestRow.status === "arrived") {
      return {
        groupLabel: strArrived,
        groupIndex: 0,
        actionButton: {
          caption: strCheckIn,
          action: () => {
            void onGuestStatusAction(guestRow, "checked_in");
          },
        },
      };
    }

    if (guestRow.status === "booked") {
      return {
        groupLabel: "Booked",
        groupIndex: 1,
        actionButton: null,
      };
    }

    if (guestRow.status === "checked_in") {
      return {
        groupLabel: strCheckedIn,
        groupIndex: 2,
        actionButton: null,
      };
    }

    return null;
  };

  if (mapGuest) {
    return (
      <HouseMapView
        openMode="selection"
        guest={mapGuest}
        initialSelectionMode={mapSelectionMode}
        onRoomSelectActionClick={onRoomSelectActionClick}
        onGuestSwapActionClick={onGuestSwapActionClick}
        onCancelActionClick={onMapCancelActionClick}
      />
    );
  }

  return (
    <section>
      {showTitle ? <h2 className="mb-4 text-xl font-bold">{strTitle}</h2> : null}
      {error ? <p role="alert" className="mb-4 text-red-600">{error}</p> : null}
      {retreatError ? <p role="alert" className="mb-4 text-red-600">{strLoadError}</p> : null}
      {isSnapshotLoading ? <p>{strLoading}</p> : null}
      {!isSnapshotLoading && mode === "meeting" ? (
        <>
          <div className="ozen-meeting-taxi-grid">
            {rideRows.map((ride) => (
              <label key={ride.id} className={ride.isSelected
                ? "ozen-meeting-taxi-card ozen-meeting-taxi-card-selected"
                : "ozen-meeting-taxi-card"}>
                <input type="checkbox" checked={ride.isSelected} onChange={ride.onChange} className="ozen-meeting-taxi-checkbox" />
                <span className="ozen-meeting-taxi-number">{ride.number}</span>
                <strong>{ride.arrival}</strong>
                <span>{ride.driver}</span>
                <small>{ride.passengerCount}</small>
              </label>
            ))}
          </div>
          {!hasRideRows ? <p className="mt-4 text-gray-600">{strNoRides}</p> : null}
          {hasRideRows && !hasSelectedRides ? <p className="mt-4 text-gray-600">{strChooseRides}</p> : null}
        </>
      ) : null}
      {!isSnapshotLoading ? (
        <GuestsCards
          guests={guestCardRows}
          getGuestCardGroup={getGuestCardGroup}
          emptyMessage={strNoGuests}
        />
      ) : null}
    </section>
  );
}