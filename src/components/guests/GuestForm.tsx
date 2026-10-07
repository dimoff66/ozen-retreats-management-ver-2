'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { CreateGuest, Guest, House, RetreatRoom, Room } from "@/services/database";
import roomsService from "@/services/roomsService";

type GuestFormProps = {
  guest: Guest | null;
  retreatId: number;
  houses: House[];
  rooms: Room[];
  retreatRooms: RetreatRoom[];
  onSaveActionClick: (data: CreateGuest) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function GuestForm({
  guest,
  retreatId,
  houses,
  rooms,
  retreatRooms,
  onSaveActionClick,
  onCancelActionClick,
}: GuestFormProps) {
  const strAddTitle = "Add guest";
  const strEditTitle = "Edit guest";
  const strName = "Name";
  const strOrganizer = "Organizer";
  const strArrivalDate = "Arrival date";
  const strDiet = "Diet";
  const strRoom = "Room";
  const strNoRoom = "No room";
  const strSave = "Save";
  const strCancel = "Cancel";

  const isEditMode = guest !== null;
  const formTitle = isEditMode ? strEditTitle : strAddTitle;

  const [name, setName] = useState(guest?.name ?? "");
  const [isOrganizer, setIsOrganizer] = useState(guest?.is_organizer ?? false);
  const [arrivalDate, setArrivalDate] = useState(guest?.arrival_date ?? "");
  const [dietNotes, setDietNotes] = useState(guest?.diet_notes ?? "");
  const [roomId, setRoomId] = useState(guest?.room_id?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const availableRoomIds = new Set(retreatRooms.map((retreatRoom) => retreatRoom.room_id));
  const availableRooms = rooms.filter((room) => room.is_available && availableRoomIds.has(room.id));
  const sortedRooms = roomsService.sortRooms(availableRooms, houses);

  const roomOptions = sortedRooms.map((room) => {
    const house = houses.find((item) => item.id === room.house_id);
    const label = house ? roomsService.getRoomDisplayName(room, house) : room.room_number;

    return {
      id: room.id,
      label,
    };
  });

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onOrganizerChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsOrganizer(event.target.checked);
  };

  const onArrivalDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setArrivalDate(event.target.value);
  };

  const onDietNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDietNotes(event.target.value);
  };

  const onRoomChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRoomId(event.target.value);
  };

  const onSubmitHandler = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data: CreateGuest = {
      retreat_id: retreatId,
      name,
      is_organizer: isOrganizer,
      arrival_date: arrivalDate || null,
      diet_notes: dietNotes || null,
      room_id: roomId ? Number(roomId) : null,
    };

    setIsSaving(true);

    try {
      await onSaveActionClick(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-semibold">{formTitle}</h2>
        <form onSubmit={onSubmitHandler}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strName}</label>
            <input value={name} onChange={onNameChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <label className="mb-4 flex items-center gap-2">
            <input type="checkbox" checked={isOrganizer} onChange={onOrganizerChange} />
            <span>{strOrganizer}</span>
          </label>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strArrivalDate}</label>
            <input type="date" value={arrivalDate} onChange={onArrivalDateChange} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strDiet}</label>
            <textarea value={dietNotes} onChange={onDietNotesChange} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium">{strRoom}</label>
            <select value={roomId} onChange={onRoomChange} className="w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="">{strNoRoom}</option>
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>{room.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelActionClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">{strCancel}</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{strSave}</button>
          </div>
        </form>
      </div>
    </div>
  );
}