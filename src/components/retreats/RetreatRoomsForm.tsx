'use client';

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Room } from "@/services/database";
import roomsService from "@/services/roomsService";
import { useRetreat } from "@/contexts/RetreatContext";

type RetreatRoomsFormProps = {
  onCloseActionClick: () => void;
};

type RoomSetting = {
  roomId: number;
  isAvailable: boolean;
  maxGuests: number;
};

const prepareRoomSettings = (
  rooms: Room[],
  retreatRooms: { room_id: number; max_guests: number }[]
): RoomSetting[] => rooms.map((room) => {
  const retreatRoom = retreatRooms.find((item) => item.room_id === room.id);

  return {
    roomId: room.id,
    isAvailable: room.is_available && retreatRoom !== undefined,
    maxGuests: retreatRoom?.max_guests ?? 1,
  };
});

export default function RetreatRoomsForm({
  onCloseActionClick,
}: RetreatRoomsFormProps) {
  const strTitle = "Retreat rooms";
  const strAvailable = "Available";
  const strMaxGuests = "Max guests";
  const strAllAvailable = "All available";
  const strAllUnavailable = "All unavailable";
  const strSetMax = "Set max";
  const strGloballyUnavailable = "Globally unavailable";
  const strSave = "Save";
  const strCancel = "Cancel";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load retreat rooms.";
  const strSaveError = "Failed to save retreat rooms.";

  const { snapshot, retreat, isLoading, error: retreatError, saveRooms } = useRetreat();
  const houses = snapshot?.houses ?? [];
  const rooms: Room[] = roomsService.sortRooms(snapshot?.rooms ?? [], houses);
  const retreatRooms = snapshot?.retreatRooms ?? [];
  const [settingsOverride, setSettingsOverride] = useState<RoomSetting[] | null>(null);
  const [houseMaxGuests, setHouseMaxGuests] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const settings = settingsOverride ?? prepareRoomSettings(rooms, retreatRooms);

  const onSaveActionClick = async () => {
    setIsSaving(true);
    setError("");

    try {
      const saveSettings = settings.map((setting) => {
        const room = rooms.find((item) => item.id === setting.roomId);
        const isGloballyAvailable = room?.is_available ?? false;

        return {
          roomId: setting.roomId,
          isAvailable: isGloballyAvailable && setting.isAvailable,
          maxGuests: Math.max(1, setting.maxGuests),
        };
      });

      await saveRooms(saveSettings);
      setSettingsOverride(null);
    } catch {
      setError(strSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const houseGroups = houses
    .map((house) => {
      const houseRooms = rooms.filter(
        (room) => room.house_id === house.id
      );

      if (houseRooms.length === 0) {
        return null;
      }

      const roomRows = houseRooms.map((room) => {
        const setting = settings.find(
          (item) => item.roomId === room.id
        );

        const isAvailable = setting?.isAvailable ?? false;
        const maxGuests = setting?.maxGuests ?? 1;
        const isGloballyAvailable = room.is_available;

        const onAvailableChange = (
          event: ChangeEvent<HTMLInputElement>
        ) => {
          const checked = event.target.checked;

          setSettingsOverride((current) =>
            (current ?? settings).map((item) =>
              item.roomId === room.id
                ? {
                    ...item,
                    isAvailable: checked,
                  }
                : item
            )
          );
        };

        const onMaxGuestsChange = (
          event: ChangeEvent<HTMLInputElement>
        ) => {
          const value = Math.max(1, Number(event.target.value));

          setSettingsOverride((current) =>
            (current ?? settings).map((item) =>
              item.roomId === room.id
                ? {
                    ...item,
                    maxGuests: value,
                  }
                : item
            )
          );
        };

        return {
          id: room.id,
          roomNumber: room.room_number,
          isAvailable,
          maxGuests,
          isGloballyAvailable,
          onAvailableChange,
          onMaxGuestsChange,
        };
      });

      const groupMaxGuests = houseMaxGuests[house.id] ?? 1;

      const onAllAvailableActionClick = () => {
        const roomIds = new Set(
          houseRooms
            .filter((room) => room.is_available)
            .map((room) => room.id)
        );

        setSettingsOverride((current) =>
          (current ?? settings).map((item) =>
            roomIds.has(item.roomId)
              ? {
                  ...item,
                  isAvailable: true,
                }
              : item
          )
        );
      };

      const onAllUnavailableActionClick = () => {
        const roomIds = new Set(
          houseRooms.map((room) => room.id)
        );

        setSettingsOverride((current) =>
          (current ?? settings).map((item) =>
            roomIds.has(item.roomId)
              ? {
                  ...item,
                  isAvailable: false,
                }
              : item
          )
        );
      };

      const onHouseMaxGuestsChange = (
        event: ChangeEvent<HTMLInputElement>
      ) => {
        const value = Math.max(1, Number(event.target.value));

        setHouseMaxGuests((current) => ({
          ...current,
          [house.id]: value,
        }));
      };

      const onSetMaxActionClick = () => {
        const roomIds = new Set(
          houseRooms
            .filter((room) => room.is_available)
            .map((room) => room.id)
        );

        setSettingsOverride((current) =>
          (current ?? settings).map((item) =>
            roomIds.has(item.roomId)
              ? {
                  ...item,
                  maxGuests: groupMaxGuests,
                }
              : item
          )
        );
      };

      return {
        id: house.id,
        name: house.name,
        roomRows,
        groupMaxGuests,
        onAllAvailableActionClick,
        onAllUnavailableActionClick,
        onHouseMaxGuestsChange,
        onSetMaxActionClick,
      };
    })
    .filter((house) => house !== null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{strTitle}</h2>
        {retreat ? <div className="mt-1 text-gray-600">{retreat.title}</div> : null}
      </div>
      <div>
        {isLoading || !snapshot ? <div>{strLoading}</div> : null}
        {error || retreatError ? <div className="mb-4 text-red-600">{error || strLoadError}</div> : null}
        {!isLoading && snapshot ? (
          <div className="space-y-6">
            {houseGroups.map((house) => (
              <div key={house.id} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-100 px-4 py-3">
                  <h3 className="font-bold">{house.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={house.onAllAvailableActionClick}
                      className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100"
                    >
                      {strAllAvailable}
                    </button>
                    <button
                      type="button"
                      onClick={house.onAllUnavailableActionClick}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {strAllUnavailable}
                    </button>
                    <label className="text-sm font-medium">{strMaxGuests}</label>
                    <input
                      type="number"
                      min={1}
                      value={house.groupMaxGuests}
                      onChange={house.onHouseMaxGuestsChange}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={house.onSetMaxActionClick}
                      className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      {strSetMax}
                    </button>
                  </div>
                </div>
                <div className="grid max-w-4xl grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                    {house.roomRows.map((room) => (
                      <div key={room.id} className="flex min-w-0 items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
                        <label className="flex shrink-0 items-center">
                          <input
                            type="checkbox"
                            checked={room.isAvailable}
                            disabled={!room.isGloballyAvailable}
                            onChange={room.onAvailableChange}
                            aria-label={`${strAvailable}: ${room.roomNumber}`}
                            className="size-5 accent-blue-600"
                          />
                        </label>
                        <div className="min-w-0 flex-1">
                          <span className="truncate font-medium">{room.roomNumber}</span>
                          {!room.isGloballyAvailable ? (
                            <span className="ml-2 text-xs text-gray-500">
                              {strGloballyUnavailable}
                            </span>
                          ) : null}
                        </div>
                        <label className="flex shrink-0 items-center gap-2 text-sm">
                          <span>{strMaxGuests}</span>
                          <input
                            type="number"
                            min={1}
                            value={room.maxGuests}
                            disabled={!room.isGloballyAvailable}
                            onChange={room.onMaxGuestsChange}
                            aria-label={`${strMaxGuests}: ${room.roomNumber}`}
                            title={strMaxGuests}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                          />
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onCloseActionClick}
            disabled={isSaving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-40"
          >
            {strCancel}
          </button>
          <button
            type="button"
            onClick={onSaveActionClick}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {strSave}
          </button>
      </div>
    </section>
  );
}