'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { CreateRoom, House, Room } from "@/services/database";

type RoomFormProps = {
  room: Room | null;
  houses: House[];
  onSaveActionClick: (data: CreateRoom) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function RoomForm({
  room,
  houses,
  onSaveActionClick,
  onCancelActionClick,
}: RoomFormProps) {
  const strAddTitle = "Add room";
  const strEditTitle = "Edit room";
  const strRoomNumber = "Room number";
  const strHouse = "House";
  const strAvailable = "Available";
  const strSelectHouse = "Select house";
  const strSave = "Save";
  const strCancel = "Cancel";

  const isEditMode = room !== null;
  const formTitle = isEditMode ? strEditTitle : strAddTitle;

  const [roomNumber, setRoomNumber] = useState(room?.room_number ?? "");
  const [houseId, setHouseId] = useState(room?.house_id?.toString() ?? "");
  const [isAvailable, setIsAvailable] = useState(room?.is_available ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const onRoomNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRoomNumber(event.target.value);
  };

  const onHouseChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setHouseId(event.target.value);
  };

  const onAvailableChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsAvailable(event.target.checked);
  };

  const onSubmitHandler = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!houseId) {
      return;
    }

    const data: CreateRoom = {
      room_number: roomNumber,
      house_id: Number(houseId),
      is_available: isAvailable,
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
            <label className="mb-1 block text-sm font-medium">{strRoomNumber}</label>
            <input value={roomNumber} onChange={onRoomNumberChange} maxLength={3} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strHouse}</label>
            <select value={houseId} onChange={onHouseChange} required className="w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="">{strSelectHouse}</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>{house.name}</option>
              ))}
            </select>
          </div>
          <label className="mb-6 flex items-center gap-2">
            <input type="checkbox" checked={isAvailable} onChange={onAvailableChange} />
            <span>{strAvailable}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelActionClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">{strCancel}</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{strSave}</button>
          </div>
        </form>
      </div>
    </div>
  );
}