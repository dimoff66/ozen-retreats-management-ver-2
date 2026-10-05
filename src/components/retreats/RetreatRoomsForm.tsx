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
    <section className="ozen-room-settings-screen">
      <div className="ozen-room-settings-header">
        <div>
          <h2>{strTitle}</h2>
          {retreat ? <p>{retreat.title}</p> : null}
        </div>
      </div>
      <div>
        {isLoading || !snapshot ? <div className="ozen-room-settings-message">{strLoading}</div> : null}
        {error || retreatError ? <div className="ozen-room-settings-message ozen-room-settings-error">{error || strLoadError}</div> : null}
        {!isLoading && snapshot ? (
          <div className="ozen-room-house-list">
            {houseGroups.map((house) => (
              <section key={house.id} className="ozen-room-house">
                <div className="ozen-room-house-header">
                  <h3>{house.name}</h3>
                  <div className="ozen-room-house-actions">
                    <button
                      type="button"
                      onClick={house.onAllAvailableActionClick}
                      className="ozen-room-small-button ozen-room-small-button-positive"
                    >
                      {strAllAvailable}
                    </button>
                    <button
                      type="button"
                      onClick={house.onAllUnavailableActionClick}
                      className="ozen-room-small-button"
                    >
                      {strAllUnavailable}
                    </button>
                    <label className="ozen-room-max-control">
                      <span>{strMaxGuests}</span>
                      <input
                        type="number"
                        min={1}
                        value={house.groupMaxGuests}
                        onChange={house.onHouseMaxGuestsChange}
                        className="ozen-room-number-input"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={house.onSetMaxActionClick}
                      className="ozen-room-small-button ozen-room-small-button-positive"
                    >
                      {strSetMax}
                    </button>
                  </div>
                </div>
                <div className="ozen-room-grid">
                  {house.roomRows.map((room) => (
                    <div key={room.id} className="ozen-room-setting-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={room.isAvailable}
                          disabled={!room.isGloballyAvailable}
                          onChange={room.onAvailableChange}
                          aria-label={`${strAvailable}: ${room.roomNumber}`}
                          className="ozen-room-checkbox"
                        />
                      </label>
                      <div className="ozen-room-setting-copy">
                        <span className="ozen-room-setting-name">{room.roomNumber}</span>
                        {!room.isGloballyAvailable ? <span className="ozen-room-unavailable-note">{strGloballyUnavailable}</span> : null}
                      </div>
                      <label className="ozen-room-capacity">
                        <span>{strMaxGuests}</span>
                        <input
                          type="number"
                          min={1}
                          value={room.maxGuests}
                          disabled={!room.isGloballyAvailable}
                          onChange={room.onMaxGuestsChange}
                          aria-label={`${strMaxGuests}: ${room.roomNumber}`}
                          title={strMaxGuests}
                          className="ozen-room-number-input"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ozen-room-settings-footer">
        <button
          type="button"
          onClick={onCloseActionClick}
          disabled={isSaving}
          className="ozen-secondary-button"
        >
          {strCancel}
        </button>
        <button
          type="button"
          onClick={onSaveActionClick}
          disabled={isSaving}
          className="ozen-primary-action"
        >
          {strSave}
        </button>
      </div>
    </section>
  );
}