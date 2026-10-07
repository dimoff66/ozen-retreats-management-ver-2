'use client';

import { useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
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

type GuestsListProps = {
  showTitle?: boolean;
};

export default function GuestsList({ showTitle = true }: GuestsListProps) {
  const strTitle = "Guests";
  const strColumnName = "Name";
  const strColumnDiet = "Diet";
  const strColumnRoom = "Room";
  const strColumnStatus = "Status";
  const strSearchGuests = "Search guests";
  const strNoMatchingGuests = "No guests match your search.";
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
  const strActions = "Actions";
  const strGuestActions = "Guest actions";
  const strNoActions = "-";
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
  const retreatRooms = snapshot?.retreatRooms ?? [];
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
  const [searchText, setSearchText] = useState("");

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

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
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
      throw new Error(strSaveRoomError);
    }

    setActionError("");

    await updateGuest(mapGuest.id, {
      room_id: room.id,
    });

    setIsMapOpen(false);
    setMapGuest(null);
    setSelectedGuest(null);

  };

  const onGuestSwapActionClick = async (targetGuest: Guest) => {
    if (!mapGuest || !selectedRetreatId || !user || !mapGuest.room_id || !targetGuest.room_id) {
      throw new Error(strSaveRoomError);
    }

    setActionError("");

    await Promise.all([
      updateGuest(mapGuest.id, { room_id: targetGuest.room_id }),
      updateGuest(targetGuest.id, { room_id: mapGuest.room_id }),
    ]);

    setIsMapOpen(false);
    setMapGuest(null);
    setSelectedGuest(null);
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
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  const visibleGuestRows = guestRows.filter((guest) => (
    `${guest.name} ${guest.arrivalText} ${guest.roomName} ${guest.statusText} ${guest.dietText}`
      .toLocaleLowerCase()
      .includes(normalizedSearchText)
  ));

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
    <div className="ozen-guests-list">
      {showTitle ? <div className="ozen-section-heading"><h2>{strTitle}</h2></div> : null}
      <ActionBar
        selectedItem={selectedGuest}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
        disabled={!canManageGuestRecords}
        extraContent={
          <label className="ozen-search-field ozen-guest-list-search">
            <span className="sr-only">{strSearchGuests}</span>
            <input type="search" value={searchText} onChange={onSearchChange} aria-label={strSearchGuests} />
            <svg aria-hidden="true" viewBox="0 0 24 24" className="ozen-search-icon">
              <circle cx="10.8" cy="10.8" r="6.3" />
              <path d="m15.5 15.5 4.2 4.2" strokeLinecap="round" />
            </svg>
          </label>
        }
        extraContentPosition="right"
      />
      {actionError ? <div className="mb-4 text-red-600">{actionError}</div> : null}
      {isSnapshotLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isSnapshotLoading && !isLoadError ? (
        <div className="ozen-table-panel">
          <table className="ozen-data-table">
            <thead>
              <tr>
                <th>{strColumnName}</th>
                <th>{strColumnRoom}</th>
                <th className="ozen-cell-center">{strColumnStatus}</th>
                <th>{strColumnDiet}</th>
                <th aria-label={strActions} />
              </tr>
            </thead>
            <tbody>
              {visibleGuestRows.map((guest) => (
                <tr key={guest.id} onClick={guest.onRowClick} className={guest.isSelected ? "ozen-data-row ozen-data-row-selected" : "ozen-data-row"}>
                  <td>
                    <div className="ozen-guest-name">{guest.name}</div>
                    {guest.arrivalText ? (
                      <div className="ozen-guest-arrival">{guest.arrivalText}</div>
                    ) : null}
                  </td>
                  <td>
                    {!canManageGuestRecords ? guest.roomName : (
                      <button type="button" onClick={guest.onRoomClick} className="ozen-room-link">{guest.roomName}</button>
                    )}
                  </td>
                  <td className="ozen-cell-center">
                    {guest.statusText ? (
                      <span className={`ozen-table-status ${guest.statusBadgeClassName}`}>
                        {guest.statusText}
                      </span>
                    ) : null}
                  </td>
                  <td>{guest.dietText}</td>
                  <td className="ozen-actions-cell" onClick={guest.onActionsCellClick}>
                    {guest.actionRows.length > 0 ? (
                      <details className="relative">
                        <summary
                          aria-label={strGuestActions}
                          title={strGuestActions}
                          onClick={guest.onActionsToggleClick}
                          className="ozen-row-more"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                          </svg>
                        </summary>
                        <div className="ozen-row-menu">
                          {guest.actionRows.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={(event) => guest.onActionClick(event, action)}
                              className="ozen-row-menu-button"
                            >
                              {action.caption}
                            </button>
                          ))}
                        </div>
                      </details>
                     ) : <span className="text-gray-400">{strNoActions}</span>}
                  </td>
                </tr>
              ))}
              {visibleGuestRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">{strNoMatchingGuests}</td>
                </tr>
              ) : null}
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
          retreatRooms={retreatRooms}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      ) : null}
    </div>
  );
}