'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import ActionBar from "@/components/common/ActionBar";
import GuestForm from "@/components/guests/GuestForm";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import type {
  CreateGuest,
  Guest,
  House,
  Retreat,
  Room,
} from "@/services/database";
import dateService from "@/services/dateService";
import guestsService from "@/services/guestsService";
import guestStatusesService from "@/services/guestStatusesService";
import type { GuestAction } from "@/services/guestActionsService";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import housesService from "@/services/housesService";
import retreatsService from "@/services/retreatsService";
import roomsService from "@/services/roomsService";

type GuestsListProps = {
  retreatId?: number;
};

export default function GuestsList({ retreatId }: GuestsListProps) {
  const strTitle = "Guests";
  const strRetreat = "Retreat";
  const strColumnName = "Name";
  const strColumnDiet = "Diet";
  const strColumnRoom = "Room";
  const strColumnStatus = "Status";
  const strOrganizer = "organizer";
  const strNoRoom = "-";
  const strNoDiet = "-";
  const strStatusBooked = "Booked";
  const strStatusCheckedIn = "Checked in";
  const strStatusArrived = "Arrived";
  const strStatusNotComing = "Not coming";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load guests.";
  const strSaveRoomError = "Failed to change room.";
  const strDeleteConfirm = "Delete selected guest?";
  const { currentUser: user } = useCurrentUser();

  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestStatuses, setGuestStatuses] = useState<Map<number, GuestStatusValue>>(new Map());
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [mapGuest, setMapGuest] = useState<Guest | null>(null);
  const [mapSelectionMode, setMapSelectionMode] = useState<"room" | "guest">("room");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [actionError, setActionError] = useState("");

  const canManageGuestRecords = user?.role === "admin" || user?.role === "organizer";

  const getStatusLabel = (status: string): string => {
    if (status === "booked") {
      return strStatusBooked;
    }

    if (status === "checked_in") {
      return strStatusCheckedIn;
    }

    if (status === "arrived") {
      return strStatusArrived;
    }

    if (status === "not_coming") {
      return strStatusNotComing;
    }

    return status;
  };

  const getStatusBadgeClassName = (status: GuestStatusValue): string => {
    if (status === "checked_in") {
      return "bg-blue-100 text-blue-800";
    }

    if (status === "arrived") {
      return "bg-green-100 text-green-800";
    }

    if (status === "not_coming") {
      return "bg-red-100 text-red-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const loadInitialData = async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [housesData, roomsData] = await Promise.all([
        housesService.getHouses(),
        roomsService.getRooms(),
      ]);

      setHouses(housesData);
      setRooms(roomsData);

      if (retreatId !== undefined) {
        setSelectedRetreatId(retreatId);
        return;
      }

      if (user.role === "organizer") {
        if (!user.retreat_id) {
          setRetreats([]);
          setSelectedRetreatId(null);
          return;
        }

        const retreat = await retreatsService.getRetreatById(user.retreat_id);

        if (retreat) {
          setRetreats([retreat]);
          setSelectedRetreatId(retreat.id);
        }

        return;
      }

      const activeRetreats = await retreatsService.getActiveRetreats();

      setRetreats(activeRetreats);
      setSelectedRetreatId(activeRetreats.length > 0 ? activeRetreats[0].id : null);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGuests = async (retreatId: number): Promise<void> => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [guestsData, statusesData] = await Promise.all([
        guestsService.getGuestsByRetreatId(retreatId),
        guestStatusesService.getLatestForRetreat(retreatId),
      ]);

      const preparedStatuses = new Map<number, GuestStatusValue>();

      statusesData.forEach((guestStatus, guestId) => {
        preparedStatuses.set(guestId, guestStatus.status);
      });

      setGuests(guestsData);
      setGuestStatuses(preparedStatuses);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRetreatChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const retreatId = Number(event.target.value);

    setSelectedRetreatId(retreatId);
    setSelectedGuest(null);
    setEditingGuest(null);
    setMapGuest(null);
    setIsFormOpen(false);
    setIsMapOpen(false);
    setActionError("");
  };

  const onAddActionClick = () => {
    if (!selectedRetreatId) {
      return;
    }

    setActionError("");
    setMapGuest(null);
    setIsMapOpen(false);
    setEditingGuest(null);
    setIsFormOpen(true);
  };

  const onEditActionClick = (guest: Guest) => {
    setActionError("");
    setMapGuest(null);
    setIsMapOpen(false);
    setEditingGuest(guest);
    setIsFormOpen(true);
  };

  const onDeleteActionClick = async (guest: Guest) => {
    const isConfirmed = window.confirm(strDeleteConfirm);

    if (!isConfirmed) {
      return;
    }

    setActionError("");

    try {
      await guestsService.deleteGuest(guest.id);
      setSelectedGuest(null);

      if (selectedRetreatId) {
        await loadGuests(selectedRetreatId);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strLoadError);
    }
  };

  const onCancelActionClick = () => {
    setIsFormOpen(false);
    setEditingGuest(null);
    setActionError("");
  };

  const onSaveActionClick = async (data: CreateGuest) => {
    setActionError("");

    try {
      if (editingGuest) {
        await guestsService.updateGuest(editingGuest.id, data);
      } else {
        await guestsService.createGuest(data);
      }

      setIsFormOpen(false);
      setEditingGuest(null);
      setSelectedGuest(null);

      if (selectedRetreatId) {
        await loadGuests(selectedRetreatId);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strLoadError);
    }
  };

  const onMapCancelActionClick = () => {
    setIsMapOpen(false);
    setMapGuest(null);
    setActionError("");
  };

  const onRoomSelectActionClick = async (room: Room) => {
    if (!mapGuest || !selectedRetreatId || !user) {
      return;
    }

    setActionError("");

    try {
      await guestsService.updateGuest(mapGuest.id, {
        room_id: room.id,
      });

      setIsMapOpen(false);
      setMapGuest(null);
      setSelectedGuest(null);

      await loadGuests(selectedRetreatId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strSaveRoomError);
    }
  };

  const onGuestSwapActionClick = async (targetGuest: Guest) => {
    if (!mapGuest || !selectedRetreatId || !user || !mapGuest.room_id || !targetGuest.room_id) {
      return;
    }

    setActionError("");

    try {
      await Promise.all([
        guestsService.updateGuest(mapGuest.id, { room_id: targetGuest.room_id }),
        guestsService.updateGuest(targetGuest.id, { room_id: mapGuest.room_id }),
      ]);

      setIsMapOpen(false);
      setMapGuest(null);
      setSelectedGuest(null);
      await loadGuests(selectedRetreatId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strSaveRoomError);
    }
  };

  const onGuestActionClick = async (guest: Guest, action: GuestAction) => {
    if (!user) {
      return;
    }

    if (action === "move_room" || action === "swap_room") {
      setActionError("");
      setSelectedGuest(guest);
      setEditingGuest(null);
      setIsFormOpen(false);
      setMapGuest(guest);
      setMapSelectionMode(action === "move_room" ? "room" : "guest");
      setIsMapOpen(true);
      return;
    }

    const statusByAction: Partial<Record<GuestAction, GuestStatusValue>> = {
      not_coming: "not_coming",
      mark_arrived: "arrived",
      check_in: "checked_in",
      cancel_check_in: "arrived",
      cancel_arrival: "booked",
    };
    const nextStatus = statusByAction[action];

    if (!nextStatus) {
      return;
    }

    setActionError("");

    try {
      const room = rooms.find((item) => item.id === guest.room_id);
      const house = houses.find((item) => item.id === room?.house_id);
      const roomName = room && house
        ? roomsService.getRoomDisplayName(room, house)
        : null;

      await guestStatusesService.createStatus(
        guest.id,
        nextStatus,
        roomName,
        user.id
      );

      if (selectedRetreatId) {
        await loadGuests(selectedRetreatId);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strLoadError);
    }
  };

  const retreatOptions = retreats.map((retreat) => {
    return {
      id: retreat.id,
      title: retreat.title,
    };
  });

  const guestRows = guests.map((guest) => {
    const room = rooms.find((item) => item.id === guest.room_id);
    const house = houses.find((item) => item.id === room?.house_id);

    const roomName = room && house
      ? roomsService.getRoomDisplayName(room, house)
      : strNoRoom;

    const name = guest.is_organizer
      ? `${guest.name} (${strOrganizer})`
      : guest.name;

    const arrivalText = guest.arrival_date
      ? dateService.formatDate(guest.arrival_date)
      : "";
    const dietText = guest.diet_notes ?? strNoDiet;
    const status = guestStatuses.get(guest.id) ?? "booked";
    const statusText = guest.room_id === null ? "" : getStatusLabel(status);
    const statusBadgeClassName = getStatusBadgeClassName(status);
    const isSelected = selectedGuest?.id === guest.id;
    const actionRows = user
      ? guestsService.getGuestMenuActions(
          guest,
          user.role,
          status,
          (targetGuest, action) => {
            void onGuestActionClick(targetGuest, action);
          }
        )
      : [];

    const onActionClick = (
      event: MouseEvent<HTMLButtonElement>,
      action: (typeof actionRows)[number]
    ) => {
      event.stopPropagation();
      event.currentTarget.closest("details")?.removeAttribute("open");
      action.action();
    };

    const onRowClick = () => {
      setSelectedGuest(guest);
    };

    const onActionsCellClick = (event: MouseEvent<HTMLTableCellElement>) => {
      event.stopPropagation();
    };

    const onActionsToggleClick = (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
    };

    const onRoomClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (!canManageGuestRecords) {
        return;
      }

      setActionError("");
      setSelectedGuest(guest);
      setEditingGuest(null);
      setIsFormOpen(false);
      setMapGuest(guest);
      setMapSelectionMode("room");
      setIsMapOpen(true);
    };

    return {
      id: guest.id,
      name,
      arrivalText,
      dietText,
      roomName,
      status,
      statusText,
      statusBadgeClassName,
      isSelected,
      actionRows,
      onActionClick,
      onRowClick,
      onActionsCellClick,
      onActionsToggleClick,
      onRoomClick,
    };
  });

  useEffect(() => {
    loadInitialData();
  }, [user?.id, retreatId]);

  useEffect(() => {
    if (!selectedRetreatId) {
      setGuests([]);
      setGuestStatuses(new Map());
      return;
    }

    loadGuests(selectedRetreatId);
  }, [selectedRetreatId]);

  if (!user) {
    return <div>{strLoading}</div>;
  }

  if (isMapOpen && mapGuest && selectedRetreatId) {
    return (
      <HouseMapView
        retreatId={selectedRetreatId}
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
    <div>
      {retreatId === undefined ? <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1> : null}
      {retreatId === undefined ? <div className="mb-4 max-w-md">
        <label className="mb-1 block text-sm font-medium">{strRetreat}</label>
        <select
          value={selectedRetreatId ?? ""}
          onChange={onRetreatChange}
          disabled={user.role === "organizer"}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100"
        >
          {retreatOptions.map((retreat) => (
            <option key={retreat.id} value={retreat.id}>{retreat.title}</option>
          ))}
        </select>
      </div> : null}
      <ActionBar
        selectedItem={selectedGuest}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
        disabled={!canManageGuestRecords}
      />
      {actionError ? <div className="mb-4 text-red-600">{actionError}</div> : null}
      {isLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isLoading && !isLoadError ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">{strColumnName}</th>
                <th className="px-4 py-3 text-left">{strColumnRoom}</th>
                <th className="px-4 py-3 text-center">{strColumnStatus}</th>
                <th className="px-4 py-3 text-left">{strColumnDiet}</th>
                <th aria-label="Actions" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {guestRows.map((guest) => (
                <tr key={guest.id} onClick={guest.onRowClick} className={guest.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}>
                  <td className="px-4 py-3">
                    <div>{guest.name}</div>
                    {guest.arrivalText ? (
                      <div className="mt-0.5 text-sm text-gray-400">{guest.arrivalText}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {!canManageGuestRecords ? guest.roomName : (
                      <button type="button" onClick={guest.onRoomClick} className="font-semibold text-blue-600 hover:underline">{guest.roomName}</button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {guest.statusText ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${guest.statusBadgeClassName}`}>
                        {guest.statusText}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{guest.dietText}</td>
                  <td className="px-4 py-3" onClick={guest.onActionsCellClick}>
                    {guest.actionRows.length > 0 ? (
                      <details className="relative">
                        <summary
                          aria-label="Guest actions"
                          title="Guest actions"
                          onClick={guest.onActionsToggleClick}
                          className="ml-auto flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 [&::-webkit-details-marker]:hidden"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                          </svg>
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                          {guest.actionRows.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={(event) => guest.onActionClick(event, action)}
                              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                            >
                              {action.caption}
                            </button>
                          ))}
                        </div>
                      </details>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {isFormOpen && selectedRetreatId ? (
        <GuestForm
          guest={editingGuest}
          retreatId={selectedRetreatId}
          houses={houses}
          rooms={rooms}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      ) : null}
    </div>
  );
}