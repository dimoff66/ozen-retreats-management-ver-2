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
    <section className="ozen-admin-section">
      <div className="ozen-admin-section-heading"><h2>{strTitle}</h2></div>
      <ActionBar selectedItem={selectedRoom} onAddActionClick={onAddActionClick} onEditActionClick={onEditActionClick} onDeleteActionClick={onDeleteActionClick} />
      {isLoading ? <div className="ozen-state-message">{strLoading}</div> : null}
      {isLoadError ? <div className="ozen-state-message ozen-state-error">{strLoadError}</div> : null}
      {!isLoading && !isLoadError ? (
        <div className="ozen-table-panel">
          <table className="ozen-data-table">
            <thead><tr><th>{strColumnRoom}</th><th>{strColumnHouse}</th><th>{strColumnNumber}</th><th>{strColumnAvailable}</th></tr></thead>
            <tbody>
              {roomRows.map((room) => (
                <tr key={room.id} onClick={room.onRowClick} className={room.isSelected ? "ozen-data-row ozen-data-row-selected" : "ozen-data-row"}>
                  <td className="ozen-admin-primary-cell">{room.displayName}</td>
                  <td>{room.houseName}</td>
                  <td>{room.roomNumber}</td>
                  <td><span className={room.availableText === strYes ? "ozen-admin-badge ozen-admin-badge-positive" : "ozen-admin-badge"}>{room.availableText}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {isFormOpen ? <RoomForm room={editingRoom} houses={houses} onSaveActionClick={onSaveActionClick} onCancelActionClick={onCancelActionClick} /> : null}
    </section>
  );
}
