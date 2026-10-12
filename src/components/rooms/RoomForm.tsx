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
    <div className="project-modal-backdrop">
      <div className="project-form-modal">
        <div className="project-form-modal-header"><h2>{formTitle}</h2></div>
        <form onSubmit={onSubmitHandler} className="project-form-body">
          <label className="project-form-field"><span>{strRoomNumber}</span><input value={roomNumber} onChange={onRoomNumberChange} maxLength={3} required /></label>
          <label className="project-form-field"><span>{strHouse}</span><select value={houseId} onChange={onHouseChange} required><option value="">{strSelectHouse}</option>{houses.map(house => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label>
          <label className="project-checkbox-field"><input type="checkbox" checked={isAvailable} onChange={onAvailableChange} /><span>{strAvailable}</span></label>
          <div className="project-form-footer"><button type="button" onClick={onCancelActionClick} className="project-action-button project-action-button-secondary">{strCancel}</button><button type="submit" disabled={isSaving} className="project-action-button project-action-button-primary">{strSave}</button></div>
        </form>
      </div>
    </div>
  );
}
