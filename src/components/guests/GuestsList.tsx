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
import guestStatusesService from "@/services/guestStatusesService";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import roomsService from "@/services/roomsService";

type GuestsListProps = {
  showTitle?: boolean;
};

export default function GuestsList(props: GuestsListProps) {
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
    swapRooms,
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

    await swapRooms(mapGuest.id, targetGuest.id);

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
      const room = rooms.find(item => item.id === guest.room_id);
      const house = houses.find(item => item.id === room?.house_id);
      const roomName = room && house
        ? roomsService.getRoomDisplayName(room, house)
        : null;

      await createStatus(guest.id, nextStatus, roomName, user.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strLoadError);
    }
  };

  const guestRows = guests.map(guest => {
    const room = rooms.find(item => item.id === guest.room_id);
    const house = houses.find(item => item.id === room?.house_id);

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
    const statusText = guest.room_id === null ? "" : guestStatusesService.getStatusLabel(status);
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
  const visibleGuestRows = guestRows.filter(guest => (
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
    <div className="project-guests-list">
      {(props.showTitle ?? true) && <div className="project-section-heading"><h2>{strTitle}</h2></div>}
      <ActionBar
        selectedItem={selectedGuest}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
        disabled={!canManageGuestRecords}
        extraContent={
          <label className="project-search-field project-guest-list-search">
            <span className="sr-only">{strSearchGuests}</span>
            <input type="search" value={searchText} onChange={onSearchChange} aria-label={strSearchGuests} />
            <svg aria-hidden="true" viewBox="0 0 24 24" className="project-search-icon">
              <circle cx="10.8" cy="10.8" r="6.3" />
              <path d="m15.5 15.5 4.2 4.2" strokeLinecap="round" />
            </svg>
          </label>
        }
        extraContentPosition="right"
      />
      {actionError && <div className="mb-4 text-red-600">{actionError}</div>}
      {isSnapshotLoading && <div>{strLoading}</div>}
      {isLoadError && <div>{strLoadError}</div>}
      {!isSnapshotLoading && !isLoadError && (
        <div className="project-table-panel">
          <table className="project-data-table">
            <thead>
              <tr>
                <th>{strColumnName}</th>
                <th>{strColumnRoom}</th>
                <th className="project-cell-center">{strColumnStatus}</th>
                <th>{strColumnDiet}</th>
                <th aria-label={strActions} />
              </tr>
            </thead>
            <tbody>
              {visibleGuestRows.map(guest => (
                <tr key={guest.id} onClick={guest.onRowClick} className={guest.isSelected ? "project-data-row project-data-row-selected" : "project-data-row"}>
                  <td>
                    <div className="project-guest-name">{guest.name}</div>
                    {guest.arrivalText && (
                      <div className="project-guest-arrival">{guest.arrivalText}</div>
                    )}
                  </td>
                  <td>
                    {!canManageGuestRecords ? guest.roomName : (
                      <button type="button" onClick={guest.onRoomClick} className="project-room-link">{guest.roomName}</button>
                    )}
                  </td>
                  <td className="project-cell-center">
                    {guest.statusText && (
                      <span className={`project-table-status ${guest.statusBadgeClassName}`}>
                        {guest.statusText}
                      </span>
                    )}
                  </td>
                  <td>{guest.dietText}</td>
                  <td className="project-actions-cell" onClick={guest.onActionsCellClick}>
                    {guest.actionRows.length > 0 ? (
                      <details className="relative">
                        <summary
                          aria-label={strGuestActions}
                          title={strGuestActions}
                          onClick={guest.onActionsToggleClick}
                          className="project-row-more"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                          </svg>
                        </summary>
                        <div className="project-row-menu">
                          {guest.actionRows.map(action => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={event => guest.onActionClick(event, action)}
                              className="project-row-menu-button"
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
              {visibleGuestRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center">{strNoMatchingGuests}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {isFormOpen && selectedRetreatId !== null && (
        <GuestForm
          guest={editingGuest}
          retreatId={selectedRetreatId}
          houses={houses}
          rooms={rooms}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      )}
    </div>
  );
}