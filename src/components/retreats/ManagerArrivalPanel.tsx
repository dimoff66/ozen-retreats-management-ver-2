'use client';

import { useEffect, useState } from "react";
import type { Guest, Room, TaxiRide } from "@/services/database";
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
  taxiRideId: number | null;
  status: GuestStatusValue;
};

type MeetingTaxiRide = {
  ride: TaxiRide;
  number: number;
  arrivalTime: string;
  arrivalTimestamp: number;
};

type MeetingTaxiGroup = {
  rides: MeetingTaxiRide[];
  firstArrivalTimestamp: number;
  label: string;
};

type ArrivalGuestCardRow = GuestCardRow & Pick<GuestRow, "houseName" | "houseId" | "taxiRideId" | "status">;

export default function ManagerArrivalPanel({ mode, showTitle = true }: ManagerArrivalPanelProps) {
  const strTitle = mode === "meeting" ? "Meeting" : "Check in";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load meeting data.";
  const strStatusError = "Failed to update guest status.";
  const strNoRides = "No taxi rides for this retreat.";
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
    retreat,
    snapshot,
    isLoading,
    error: retreatError,
    createStatus,
    updateGuest,
    swapRooms,
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
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const [pendingGuestIds, setPendingGuestIds] = useState<Set<number>>(new Set());
  const [mapGuest, setMapGuest] = useState<Guest | null>(null);
  const [mapSelectionMode, setMapSelectionMode] = useState<"room" | "guest">("room");
  const [error, setError] = useState("");
  const sortedRides = [...rides].sort((left, right) => {
    const timeDifference = Date.parse(left.arrival_datetime) - Date.parse(right.arrival_datetime);

    return timeDifference || left.id - right.id;
  });
  const systemNow = new Date();
  const retreatClock = retreat
    ? new Date(`${retreat.start_date}T${String(systemNow.getHours()).padStart(2, "0")}:${String(systemNow.getMinutes()).padStart(2, "0")}:${String(systemNow.getSeconds()).padStart(2, "0")}`)
    : null;
  const nearestRideId = retreatClock && sortedRides.length > 0
    ? sortedRides.reduce((nearestRide, ride) => {
        const nearestDifference = Math.abs(Date.parse(nearestRide.arrival_datetime) - retreatClock.getTime());
        const rideDifference = Math.abs(Date.parse(ride.arrival_datetime) - retreatClock.getTime());

        return rideDifference < nearestDifference ? ride : nearestRide;
      }).id
    : null;
  const selectedRideIsAvailable = selectedRideId !== null
    && sortedRides.some(ride => ride.id === selectedRideId);
  const activeSelectedRideId = selectedRideIsAvailable ? selectedRideId : nearestRideId;

  useEffect(() => {
    if (!selectedRideIsAvailable && selectedRideId !== nearestRideId) {
      setSelectedRideId(nearestRideId);
    }
  }, [nearestRideId, selectedRideId, selectedRideIsAvailable]);

  const onRideSelect = (rideId: number) => {
    setSelectedRideId(rideId);
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

    setPendingGuestIds(current => new Set(current).add(guestRow.guest.id));
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
      setPendingGuestIds(current => {
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

    await swapRooms(mapGuest.id, targetGuest.id);
    setMapGuest(null);
  };

  const onMapCancelActionClick = () => {
    setMapGuest(null);
  };

  const meetingTaxiRides: MeetingTaxiRide[] = sortedRides.map((ride, index) => {
    const arrivalDate = new Date(ride.arrival_datetime);
    const arrivalTime = arrivalDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    return {
      ride,
      number: index + 1,
      arrivalTime,
      arrivalTimestamp: arrivalDate.getTime(),
    };
  });
  const meetingTaxiGroups: MeetingTaxiGroup[] = [];

  meetingTaxiRides.forEach(taxiRide => {
    const currentGroup = meetingTaxiGroups[meetingTaxiGroups.length - 1];
    const belongsToCurrentGroup = currentGroup
      && taxiRide.arrivalTimestamp - currentGroup.firstArrivalTimestamp <= 15 * 60 * 1000;

    if (currentGroup && belongsToCurrentGroup) {
      currentGroup.rides.push(taxiRide);
      return;
    }

    meetingTaxiGroups.push({
      rides: [taxiRide],
      firstArrivalTimestamp: taxiRide.arrivalTimestamp,
      label: "",
    });
  });

  const meetingGroupColorByRideId = new Map<number, number>();

  meetingTaxiGroups.forEach((group, groupIndex) => {
    const firstRide = group.rides[0];
    const lastRide = group.rides[group.rides.length - 1];
    const taxiNumbers = group.rides.map(taxiRide => taxiRide.number).join(",");
    const timeLabel = firstRide.arrivalTime === lastRide.arrivalTime
      ? firstRide.arrivalTime
      : `${firstRide.arrivalTime}-${lastRide.arrivalTime}`;

    group.label = `${strTaxi} ${taxiNumbers}: ${timeLabel}`;
    group.rides.forEach(taxiRide => {
      meetingGroupColorByRideId.set(taxiRide.ride.id, groupIndex % 6);
    });
  });

  const selectedMeetingGroupIndex = meetingTaxiGroups.findIndex(group => (
    group.rides.some(taxiRide => taxiRide.ride.id === activeSelectedRideId)
  ));
  const orderedMeetingTaxiGroups = selectedMeetingGroupIndex > 0
    ? [
        ...meetingTaxiGroups.slice(selectedMeetingGroupIndex),
        ...meetingTaxiGroups.slice(0, selectedMeetingGroupIndex),
      ]
    : meetingTaxiGroups;
  const meetingGroupByRideId = new Map<number, { label: string; order: number }>();

  orderedMeetingTaxiGroups.forEach((group, order) => {
    group.rides.forEach(taxiRide => {
      meetingGroupByRideId.set(taxiRide.ride.id, { label: group.label, order });
    });
  });

  const rideRows = meetingTaxiRides.map(taxiRide => {
    const rideGuestAssignments = taxiGuests.filter(taxiGuest => taxiGuest.ride_id === taxiRide.ride.id);
    const passengerCount = rideGuestAssignments.length;
    const isSelected = taxiRide.ride.id === activeSelectedRideId;
    const onChange = () => {
      onRideSelect(taxiRide.ride.id);
    };

    const groupColorIndex = meetingGroupColorByRideId.get(taxiRide.ride.id) ?? 0;
    const groupClassName = `project-meeting-taxi-group-${groupColorIndex}`;
    const cardClassName = isSelected
      ? `project-meeting-taxi-card ${groupClassName} project-meeting-taxi-card-selected`
      : `project-meeting-taxi-card ${groupClassName}`;

    return {
      id: taxiRide.ride.id,
      number: `${strTaxi} ${taxiRide.number}`,
      arrivalTime: taxiRide.arrivalTime,
      arrivalDate: dateService.formatDate(taxiRide.ride.arrival_datetime),
      driver: taxiRide.ride.driver_name || strDriver,
      passengerCount: `${passengerCount} ${strPassengers}`,
      isSelected,
      cardClassName,
      onChange,
    };
  });
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const houseById = new Map(houses.map(house => [house.id, house]));
  const taxiNumberById = new Map(meetingTaxiRides.map(taxiRide => [
    taxiRide.ride.id,
    `${strTaxi} ${taxiRide.number}`,
  ]));
  const taxiGuestByGuestId = new Map(taxiGuests.flatMap(taxiGuest => (
    taxiGuest.guest_id === null ? [] : [[taxiGuest.guest_id, taxiGuest] as const]
  )));
  const sortedHouseIds = [...houses].sort((left, right) => left.id - right.id).map(house => house.id);
  const houseOrderById = new Map(sortedHouseIds.map((houseId, index) => [houseId, index]));
  const meetingGroupStride = houses.length + 1;
  const guestRows = guests.map((guest): GuestRow => {
    const room = guest.room_id === null ? undefined : roomById.get(guest.room_id);
    const house = room ? houseById.get(room.house_id) : undefined;
    const roomName = room && house
      ? roomsService.getRoomDisplayName(room, house)
      : strRoomUnknown;
    const taxiAssignment = taxiGuestByGuestId.get(guest.id);

    return {
      guest,
      roomName,
      houseName: house?.name ?? strNoHouse,
      houseId: house?.id ?? null,
      taxiNumber: taxiAssignment
        ? taxiNumberById.get(taxiAssignment.ride_id) ?? strNoTaxi
        : strNoTaxi,
      taxiRideId: taxiAssignment?.ride_id ?? null,
      status: statuses.get(guest.id) ?? "booked",
    };
  }).sort((left, right) => (left.houseId ?? Number.MAX_SAFE_INTEGER) - (right.houseId ?? Number.MAX_SAFE_INTEGER)
    || left.roomName.localeCompare(right.roomName)
    || left.guest.name.localeCompare(right.guest.name));
  const guestCardRows: ArrivalGuestCardRow[] = guestRows.map(guestRow => {
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
  const getGuestCardGroup = (guestRow: ArrivalGuestCardRow) => {
    if (mode === "meeting") {
      const meetingGroup = guestRow.taxiRideId === null
        ? null
        : meetingGroupByRideId.get(guestRow.taxiRideId) ?? null;
      const mainGroupLabel = meetingGroup?.label ?? strNoTaxi;
      const mainGroupOrder = meetingGroup?.order ?? orderedMeetingTaxiGroups.length;
      const houseOrder = guestRow.houseId === null
        ? houses.length
        : houseOrderById.get(guestRow.houseId) ?? houses.length;

      return {
        groupLabel: `${mainGroupLabel} | ${guestRow.houseName}`,
        groupIndex: mainGroupOrder * meetingGroupStride + houseOrder,
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

    if (guestRow.houseId === null) {
      return null;
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
      {showTitle && <h2 className="mb-4 text-xl font-bold">{strTitle}</h2>}
      {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
      {retreatError && <p role="alert" className="mb-4 text-red-600">{strLoadError}</p>}
      {isSnapshotLoading && <p>{strLoading}</p>}
      {!isSnapshotLoading && mode === "meeting" && (
        <>
          <div className="project-meeting-taxi-grid">
            {rideRows.map(ride => (
              <label key={ride.id} className={ride.cardClassName}>
                <input type="radio" name="meeting-taxi" checked={ride.isSelected} onChange={ride.onChange} className="project-meeting-taxi-checkbox" />
                <span className="project-meeting-taxi-number">{ride.number}</span>
                <strong>{ride.arrivalTime}</strong>
                <span className="project-taxi-date">{ride.arrivalDate}</span>
                <span>{ride.driver}</span>
                <small>{ride.passengerCount}</small>
              </label>
            ))}
          </div>
          {!hasRideRows && <p className="mt-4 text-gray-600">{strNoRides}</p>}
        </>
      )}
      {!isSnapshotLoading && (
        <GuestsCards
          guests={guestCardRows}
          getGuestCardGroup={getGuestCardGroup}
          emptyMessage={strNoGuests}
        />
      )}
    </section>
  );
}