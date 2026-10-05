'use client';

import { useState } from "react";
import type { MouseEvent } from "react";
import ActionBar from "@/components/common/ActionBar";
import GuestForm from "@/components/guests/GuestForm";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useRetreat } from "@/contexts/RetreatContext";
import type {
  CreateGuest,
  Guest,
  Room,
} from "@/services/database";
import dateService from "@/services/dateService";
import type { GuestAction } from "@/services/guestActionsService";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import roomsService from "@/services/roomsService";

export default function GuestsList() {
  const strTitle = "Guests";
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
  const {
    snapshot,
    retreat,
    isLoading,
    error: retreatError,
    createGuest,
    updateGuest,
    deleteGuest,
    createStatus,
  } = useRetreat();

  const houses = snapshot?.houses ?? [];
  const rooms: Room[] = snapshot?.rooms ?? [];
  const guests = snapshot?.guests ?? [];
  const guestStatuses = new Map(
    Array.from(snapshot?.latestStatuses ?? [], ([guestId, latestStatus]) => [guestId, latestStatus.status])
  );
  const selectedRetreatId = retreat?.id ?? null;
  const isSnapshotLoading = isLoading || !snapshot;
  const isLoadError = Boolean(retreatError);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [mapGuest, setMapGuest] = useState<Guest | null>(null);
  const [mapSelectionMode, setMapSelectionMode] = useState<"room" | "guest">("room");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
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
      await deleteGuest(guest.id);
      setSelectedGuest(null);
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
        await updateGuest(editingGuest.id, data);
      } else {
        await createGuest(data);
      }

      setIsFormOpen(false);
      setEditingGuest(null);
      setSelectedGuest(null);

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
      await updateGuest(mapGuest.id, {
        room_id: room.id,
      });

      setIsMapOpen(false);
      setMapGuest(null);
      setSelectedGuest(null);

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
        updateGuest(mapGuest.id, { room_id: targetGuest.room_id }),
        updateGuest(targetGuest.id, { room_id: mapGuest.room_id }),
      ]);

      setIsMapOpen(false);
      setMapGuest(null);
      setSelectedGuest(null);
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

      await createStatus(guest.id, nextStatus, roomName, user.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strLoadError);
    }
  };

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

  if (!user) {
    return <div>{strLoading}</div>;
  }

  if (isMapOpen && mapGuest && selectedRetreatId) {
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
    <div>
      <h2 className="mb-4 text-xl font-bold">{strTitle}</h2>
      <ActionBar
        selectedItem={selectedGuest}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
        disabled={!canManageGuestRecords}
      />
      {actionError ? <div className="mb-4 text-red-600">{actionError}</div> : null}
      {isSnapshotLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isSnapshotLoading && !isLoadError ? (
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