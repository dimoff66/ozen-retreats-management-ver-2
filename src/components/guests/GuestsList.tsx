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
import guestsService from "@/services/guestsService";
import guestStatusesService from "@/services/guestStatusesService";
import housesService from "@/services/housesService";
import retreatsService from "@/services/retreatsService";
import roomsService from "@/services/roomsService";

export default function GuestsList() {
  const strTitle = "Guests";
  const strRetreat = "Retreat";
  const strColumnName = "Name";
  const strColumnArrival = "Arrival date";
  const strColumnDiet = "Diet";
  const strColumnRoom = "Room";
  const strColumnStatus = "Status";
  const strOrganizer = "organizer";
  const strNoRoom = "-";
  const strNoDiet = "-";
  const strDefaultArrival = "-";
  const strNoStatus = "-";
  const strStatusBooked = "Booked";
  const strStatusCheckedIn = "Checked in";
  const strStatusRegistered = "Registered";
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
  const [guestStatuses, setGuestStatuses] = useState<Map<number, string>>(new Map());
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [mapGuest, setMapGuest] = useState<Guest | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [actionError, setActionError] = useState("");

  const isOrganizerRole = user?.role === "organizer";

  const getStatusLabel = (status: string): string => {
    if (status === "booked") {
      return strStatusBooked;
    }

    if (status === "checked_in") {
      return strStatusCheckedIn;
    }

    if (status === "registered") {
      return strStatusRegistered;
    }

    if (status === "not_coming") {
      return strStatusNotComing;
    }

    return status;
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

      const preparedStatuses = new Map<number, string>();

      statusesData.forEach((guestStatus, guestId) => {
        preparedStatuses.set(guestId, getStatusLabel(guestStatus.status));
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
    if (!mapGuest || !selectedRetreatId) {
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

    const arrivalText = guest.arrival_date ?? strDefaultArrival;
    const dietText = guest.diet_notes ?? strNoDiet;
    const statusText = guestStatuses.get(guest.id) ?? strNoStatus;
    const isSelected = selectedGuest?.id === guest.id;

    const onRowClick = () => {
      setSelectedGuest(guest);
    };

    const onRoomClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      setActionError("");
      setSelectedGuest(guest);
      setEditingGuest(null);
      setIsFormOpen(false);
      setMapGuest(guest);
      setIsMapOpen(true);
    };

    return {
      id: guest.id,
      name,
      arrivalText,
      dietText,
      roomName,
      statusText,
      isSelected,
      onRowClick,
      onRoomClick,
    };
  });

  useEffect(() => {
    loadInitialData();
  }, [user?.id]);

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
        onRoomSelectActionClick={onRoomSelectActionClick}
        onCancelActionClick={onMapCancelActionClick}
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1>
      <div className="mb-4 max-w-md">
        <label className="mb-1 block text-sm font-medium">{strRetreat}</label>
        <select
          value={selectedRetreatId ?? ""}
          onChange={onRetreatChange}
          disabled={isOrganizerRole}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100"
        >
          {retreatOptions.map((retreat) => (
            <option key={retreat.id} value={retreat.id}>{retreat.title}</option>
          ))}
        </select>
      </div>
      <ActionBar
        selectedItem={selectedGuest}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
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
                <th className="px-4 py-3 text-left">{strColumnArrival}</th>
                <th className="px-4 py-3 text-left">{strColumnDiet}</th>
                <th className="px-4 py-3 text-left">{strColumnRoom}</th>
                <th className="px-4 py-3 text-left">{strColumnStatus}</th>
              </tr>
            </thead>
            <tbody>
              {guestRows.map((guest) => (
                <tr key={guest.id} onClick={guest.onRowClick} className={guest.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}>
                  <td className="px-4 py-3">{guest.name}</td>
                  <td className="px-4 py-3">{guest.arrivalText}</td>
                  <td className="px-4 py-3">{guest.dietText}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={guest.onRoomClick} className="font-semibold text-blue-600 hover:underline">{guest.roomName}</button>
                  </td>
                  <td className="px-4 py-3">{guest.statusText}</td>
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