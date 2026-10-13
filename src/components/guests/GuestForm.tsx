'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import { useRetreat } from "@/contexts/RetreatContext";
import type { CreateGuest, Guest, Room } from "@/services/database";

type GuestFormProps = {
  guest: Guest | null;
  retreatId: number;
  onSaveActionClick: (data: CreateGuest) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function GuestForm(props: GuestFormProps) {
  const strAddTitle = "Add guest";
  const strEditTitle = "Edit guest";
  const strName = "Name";
  const strOrganizer = "Organizer";
  const strArrivalDate = "Arrival date";
  const strDiet = "Diet";
  const strRoom = "Room";
  const strNoRoom = "No room";
  const strChooseRoom = "Choose on map";
  const strClearRoom = "Clear room";
  const strNewGuest = "new guest";
  const strSave = "Save";
  const strCancel = "Cancel";

  const isEditMode = props.guest !== null;
  const formTitle = isEditMode ? strEditTitle : strAddTitle;
  const { getRoomDisplayNameById } = useRetreat();

  const [name, setName] = useState(props.guest?.name ?? "");
  const [isOrganizer, setIsOrganizer] = useState(props.guest?.is_organizer ?? false);
  const [arrivalDate, setArrivalDate] = useState(props.guest?.arrival_date ?? "");
  const [dietNotes, setDietNotes] = useState(props.guest?.diet_notes ?? "");
  const [roomId, setRoomId] = useState(props.guest?.room_id?.toString() ?? "");
  const [isRoomMapOpen, setIsRoomMapOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedRoomId = roomId ? Number(roomId) : null;
  const roomLabel = getRoomDisplayNameById(selectedRoomId) || strNoRoom;
  const roomSelectionTarget = {
    guestId: props.guest?.id ?? null,
    name: name.trim() || props.guest?.name || strNewGuest,
    roomId: selectedRoomId,
  };

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

  const onChooseRoomActionClick = () => {
    setIsRoomMapOpen(true);
  };

  const onClearRoomActionClick = () => {
    setRoomId("");
  };

  const onRoomMapCancelActionClick = () => {
    setIsRoomMapOpen(false);
  };

  const onRoomSelectActionClick = async (room: Room) => {
    setRoomId(room.id.toString());
    setIsRoomMapOpen(false);
  };

  const onSubmitHandler = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data: CreateGuest = {
      retreat_id: props.retreatId,
      name,
      is_organizer: isOrganizer,
      arrival_date: arrivalDate || null,
      diet_notes: dietNotes || null,
      room_id: roomId ? Number(roomId) : null,
    };

    setIsSaving(true);

    try {
      await props.onSaveActionClick(data);
    } finally {
      setIsSaving(false);
    }
  };

  if (isRoomMapOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white p-6 shadow-xl">
          <HouseMapView
            openMode="selection"
            initialSelectionMode="room"
            roomSelectionTarget={roomSelectionTarget}
            onRoomSelectActionClick={onRoomSelectActionClick}
            onCancelActionClick={onRoomMapCancelActionClick}
            showRoomSelectionList={false}
          />
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <button type="button" onClick={onChooseRoomActionClick} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-left hover:bg-gray-50">
                <span className="block truncate">{roomLabel}</span>
                <span className="block text-xs text-gray-500">{strChooseRoom}</span>
              </button>
              {roomId && (
                <button type="button" onClick={onClearRoomActionClick} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold">
                  {strClearRoom}
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={props.onCancelActionClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">{strCancel}</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{strSave}</button>
          </div>
        </form>
      </div>
    </div>
  );
}