'use client';

import { useEffect, useState } from "react";
import ActionBar from "@/components/common/ActionBar";
import RoomForm from "@/components/rooms/RoomForm";
import type { CreateRoom, House, Room } from "@/services/database";
import housesService from "@/services/housesService";
import roomsService from "@/services/roomsService";

export default function RoomsList() {
  const strTitle = "Rooms";
  const strColumnRoom = "Room";
  const strColumnHouse = "House";
  const strColumnNumber = "Number";
  const strColumnAvailable = "Available";
  const strYes = "Yes";
  const strNo = "No";
  const strUnknownHouse = "-";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load rooms.";
  const strDeleteConfirm = "Delete selected room?";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [roomsData, housesData] = await Promise.all([
        roomsService.getRooms(),
        housesService.getHouses(),
      ]);

      const sortedRooms = roomsService.sortRooms(roomsData, housesData);

      setRooms(sortedRooms);
      setHouses(housesData);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onAddActionClick = () => {
    setEditingRoom(null);
    setIsFormOpen(true);
  };

  const onEditActionClick = (room: Room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const onDeleteActionClick = async (room: Room) => {
    const isConfirmed = window.confirm(strDeleteConfirm);

    if (!isConfirmed) {
      return;
    }

    await roomsService.deleteRoom(room.id);
    setSelectedRoom(null);
    await loadData();
  };

  const onCancelActionClick = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const onSaveActionClick = async (data: CreateRoom) => {
    const isEditMode = editingRoom !== null;

    if (isEditMode) {
      await roomsService.updateRoom(editingRoom.id, data);
    } else {
      await roomsService.createRoom(data);
    }

    setIsFormOpen(false);
    setEditingRoom(null);
    setSelectedRoom(null);
    await loadData();
  };

  const roomRows = rooms.map((room) => {
    const house = houses.find((item) => item.id === room.house_id);
    const houseName = house?.name ?? strUnknownHouse;
    const displayName = house ? roomsService.getRoomDisplayName(room, house) : room.room_number;
    const availableText = room.is_available ? strYes : strNo;
    const isSelected = selectedRoom?.id === room.id;

    const onRowClick = () => {
      setSelectedRoom(room);
    };

    return {
      id: room.id,
      displayName,
      houseName,
      roomNumber: room.room_number,
      availableText,
      isSelected,
      onRowClick,
    };
  });

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1>
      <ActionBar
        selectedItem={selectedRoom}
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
                <th className="px-4 py-3 text-left">{strColumnRoom}</th>
                <th className="px-4 py-3 text-left">{strColumnHouse}</th>
                <th className="px-4 py-3 text-left">{strColumnNumber}</th>
                <th className="px-4 py-3 text-left">{strColumnAvailable}</th>
              </tr>
            </thead>
            <tbody>
              {roomRows.map((room) => (
                <tr
                  key={room.id}
                  onClick={room.onRowClick}
                  className={room.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}
                >
                  <td className="px-4 py-3">{room.displayName}</td>
                  <td className="px-4 py-3">{room.houseName}</td>
                  <td className="px-4 py-3">{room.roomNumber}</td>
                  <td className="px-4 py-3">{room.availableText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {isFormOpen ? (
        <RoomForm
          room={editingRoom}
          houses={houses}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      ) : null}
    </div>
  );
}