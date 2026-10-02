'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import ActionBar from "@/components/common/ActionBar";
import GuestForm from "@/components/guests/GuestForm";
import type {
  CreateGuest,
  Guest,
  House,
  Retreat,
  Room,
} from "@/services/database";
import guestsService from "@/services/guestsService";
import housesService from "@/services/housesService";
import retreatsService from "@/services/retreatsService";
import roomsService from "@/services/roomsService";

type GuestsListProps = {
  userRole?: string;
  userRetreatId?: number | null;
};

export default function GuestsList({
  userRole = "admin",
  userRetreatId = null,
}: GuestsListProps) {
  const strTitle = "Guests";
  const strRetreat = "Retreat";
  const strColumnName = "Name";
  const strColumnOrganizer = "Organizer";
  const strColumnArrival = "Arrival date";
  const strColumnDiet = "Diet";
  const strColumnRoom = "Room";
  const strYes = "Yes";
  const strNo = "No";
  const strNoRoom = "-";
  const strNoDiet = "-";
  const strDefaultArrival = "-";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load guests.";
  const strDeleteConfirm = "Delete selected guest?";

  const isOrganizerRole = userRole === "organizer";

  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadInitialData = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [housesData, roomsData] = await Promise.all([
        housesService.getHouses(),
        roomsService.getRooms(),
      ]);

      setHouses(housesData);
      setRooms(roomsData);

      if (isOrganizerRole && userRetreatId) {
        const retreat = await retreatsService.getRetreatById(userRetreatId);

        if (retreat) {
          setRetreats([retreat]);
          setSelectedRetreatId(retreat.id);
        }

        return;
      }

      const activeRetreats = await retreatsService.getActiveRetreats();

      setRetreats(activeRetreats);

      if (activeRetreats.length > 0) {
        setSelectedRetreatId(activeRetreats[0].id);
      }
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGuests = async (retreatId: number) => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const data = await guestsService.getGuestsByRetreatId(retreatId);
      setGuests(data);
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
  };

  const onAddActionClick = () => {
    if (!selectedRetreatId) {
      return;
    }

    setEditingGuest(null);
    setIsFormOpen(true);
  };

  const onEditActionClick = (guest: Guest) => {
    setEditingGuest(guest);
    setIsFormOpen(true);
  };

  const onDeleteActionClick = async (guest: Guest) => {
    const isConfirmed = window.confirm(strDeleteConfirm);

    if (!isConfirmed) {
      return;
    }

    await guestsService.deleteGuest(guest.id);
    setSelectedGuest(null);

    if (selectedRetreatId) {
      await loadGuests(selectedRetreatId);
    }
  };

  const onCancelActionClick = () => {
    setIsFormOpen(false);
    setEditingGuest(null);
  };

  const onSaveActionClick = async (data: CreateGuest) => {
    const isEditMode = editingGuest !== null;

    if (isEditMode) {
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

    const organizerText = guest.is_organizer ? strYes : strNo;
    const arrivalText = guest.arrival_date ?? strDefaultArrival;
    const dietText = guest.diet_notes ?? strNoDiet;
    const isSelected = selectedGuest?.id === guest.id;

    const onRowClick = () => {
      setSelectedGuest(guest);
    };

    const onRoomClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      return;
    };

    return {
      id: guest.id,
      name: guest.name,
      organizerText,
      arrivalText,
      dietText,
      roomName,
      isSelected,
      onRowClick,
      onRoomClick,
    };
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedRetreatId) {
      setGuests([]);
      return;
    }

    loadGuests(selectedRetreatId);
  }, [selectedRetreatId]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1>
      <div className="mb-4 max-w-md">
        <label className="mb-1 block text-sm font-medium">{strRetreat}</label>
        <select value={selectedRetreatId ?? ""} onChange={onRetreatChange} disabled={isOrganizerRole} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100">
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
      {isLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isLoading && !isLoadError ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">{strColumnName}</th>
                <th className="px-4 py-3 text-left">{strColumnOrganizer}</th>
                <th className="px-4 py-3 text-left">{strColumnArrival}</th>
                <th className="px-4 py-3 text-left">{strColumnDiet}</th>
                <th className="px-4 py-3 text-left">{strColumnRoom}</th>
              </tr>
            </thead>
            <tbody>
              {guestRows.map((guest) => (
                <tr
                  key={guest.id}
                  onClick={guest.onRowClick}
                  className={guest.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}
                >
                  <td className="px-4 py-3">{guest.name}</td>
                  <td className="px-4 py-3">{guest.organizerText}</td>
                  <td className="px-4 py-3">{guest.arrivalText}</td>
                  <td className="px-4 py-3">{guest.dietText}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={guest.onRoomClick} className="font-semibold text-blue-600 hover:underline">{guest.roomName}</button>
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