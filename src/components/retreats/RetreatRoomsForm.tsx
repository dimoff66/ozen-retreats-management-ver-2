'use client';

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Room } from "@/services/database";
import roomsService from "@/services/roomsService";
import { useRetreat } from "@/contexts/RetreatContext";

type RetreatRoomsFormProps = {
  onCloseActionClick: () => void;
  showTitle?: boolean;
};

type RoomSetting = {
  roomId: number;
  isAvailable: boolean;
  maxGuests: number;
};

export default function RetreatRoomsForm(props: RetreatRoomsFormProps) {
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
  const strOccupiedRoomWarning = "This room already has assigned guests and cannot be made unavailable.";
  const strOccupiedHouseWarning = "Some rooms in this house already have assigned guests and cannot be made unavailable.";

  const retreatContext = useRetreat();
  const houses = retreatContext.snapshot?.houses ?? [];
  const rooms: Room[] = roomsService.sortRooms(retreatContext.snapshot?.rooms ?? [], houses);
  const guests = retreatContext.snapshot?.guests ?? [];
  const latestStatuses = retreatContext.snapshot?.latestStatuses ?? new Map();
  const occupiedRoomIds = new Set(
    guests.flatMap(guest => {
      if (!guest.room_id) {
        return [];
      }

      const status = latestStatuses.get(guest.id);

      return status?.status === "not_coming" ? [] : [guest.room_id];
    })
  );
  const [settingsOverride, setSettingsOverride] = useState<RoomSetting[] | null>(null);
  const [houseMaxGuests, setHouseMaxGuests] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const settings = settingsOverride ?? rooms.map(room => {
    const retreatRoom = retreatContext.findRetreatRoom(room.id);

    return {
      roomId: room.id,
      isAvailable: room.is_available && retreatRoom !== undefined,
      maxGuests: retreatRoom?.max_guests ?? 1,
    };
  });

  const onSaveActionClick = async () => {
    setIsSaving(true);
    setError("");

    try {
      const saveSettings = settings.map(setting => {
        const room = retreatContext.findRoom(setting.roomId);
        const isGloballyAvailable = room?.is_available ?? false;

        return {
          roomId: setting.roomId,
          isAvailable: isGloballyAvailable && setting.isAvailable,
          maxGuests: Math.max(1, setting.maxGuests),
        };
      });

      await retreatContext.saveRooms(saveSettings);
      setSettingsOverride(null);
    } catch {
      setError(strSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const houseGroups = houses
    .map(house => {
      const houseRooms = rooms.filter(
        room => room.house_id === house.id
      );

      if (houseRooms.length === 0) {
        return null;
      }

      const roomRows = houseRooms.map(room => {
        const setting = settings.find(
          item => item.roomId === room.id
        );

        const isAvailable = setting?.isAvailable ?? false;
        const maxGuests = setting?.maxGuests ?? 1;
        const isGloballyAvailable = room.is_available;

        const onAvailableChange = (
          event: ChangeEvent<HTMLInputElement>
        ) => {
          const checked = event.target.checked;

          if (!checked && occupiedRoomIds.has(room.id)) {
            window.alert(strOccupiedRoomWarning);
            return;
          }

          setSettingsOverride(current =>
            (current ?? settings).map(item =>
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

          setSettingsOverride(current =>
            (current ?? settings).map(item =>
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
          roomName: retreatContext.getRoomDisplayNameById(room.id),
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
            .filter(room => room.is_available)
            .map(room => room.id)
        );

        setSettingsOverride(current =>
          (current ?? settings).map(item =>
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
        const hasOccupiedRooms = houseRooms.some(room => occupiedRoomIds.has(room.id));

        if (hasOccupiedRooms) {
          window.alert(strOccupiedHouseWarning);
          return;
        }

        const roomIds = new Set(
          houseRooms.map(room => room.id)
        );

        setSettingsOverride(current =>
          (current ?? settings).map(item =>
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

        setHouseMaxGuests(current => ({
          ...current,
          [house.id]: value,
        }));
      };

      const onSetMaxActionClick = () => {
        const roomIds = new Set(
          houseRooms
            .filter(room => room.is_available)
            .map(room => room.id)
        );

        setSettingsOverride(current =>
          (current ?? settings).map(item =>
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
    .filter(house => house !== null);

  return (
    <section className="project-room-settings-screen">
      {(props.showTitle ?? true) && (
        <div className="project-room-settings-header">
          <div>
            <h2>{strTitle}</h2>
            {retreatContext.retreat && <p>{retreatContext.retreat.title}</p>}
          </div>
        </div>
      )}
      <div>
        {(retreatContext.isLoading || !retreatContext.snapshot) && <div className="project-room-settings-message">{strLoading}</div>}
        {(error || retreatContext.error) && <div className="project-room-settings-message project-room-settings-error">{error || strLoadError}</div>}
        {!retreatContext.isLoading && retreatContext.snapshot && (
          <div className="project-room-house-list">
            {houseGroups.map(house => (
              <section key={house.id} className="project-room-house">
                <div className="project-room-house-header">
                  <h3>{house.name}</h3>
                  <div className="project-room-house-actions">
                    <button
                      type="button"
                      onClick={house.onAllAvailableActionClick}
                      className="project-room-small-button project-room-small-button-positive"
                    >
                      {strAllAvailable}
                    </button>
                    <button
                      type="button"
                      onClick={house.onAllUnavailableActionClick}
                      className="project-room-small-button"
                    >
                      {strAllUnavailable}
                    </button>
                    <label className="project-room-max-control">
                      <span>{strMaxGuests}</span>
                      <input
                        type="number"
                        min={1}
                        value={house.groupMaxGuests}
                        onChange={house.onHouseMaxGuestsChange}
                        className="project-room-number-input"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={house.onSetMaxActionClick}
                      className="project-room-small-button project-room-small-button-positive"
                    >
                      {strSetMax}
                    </button>
                  </div>
                </div>
                <div className="project-room-grid">
                  {house.roomRows.map(room => (
                    <div key={room.id} className="project-room-setting-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={room.isAvailable}
                          disabled={!room.isGloballyAvailable}
                          onChange={room.onAvailableChange}
                          aria-label={`${strAvailable}: ${room.roomName}`}
                          className="project-room-checkbox"
                        />
                      </label>
                      <div className="project-room-setting-copy">
                        <span className="project-room-setting-name">{room.roomName}</span>
                        {!room.isGloballyAvailable && <span className="project-room-unavailable-note">{strGloballyUnavailable}</span>}
                      </div>
                      <label className="project-room-capacity">
                        <span>{strMaxGuests}</span>
                        <input
                          type="number"
                          min={1}
                          value={room.maxGuests}
                          disabled={!room.isGloballyAvailable}
                          onChange={room.onMaxGuestsChange}
                          aria-label={`${strMaxGuests}: ${room.roomName}`}
                          title={strMaxGuests}
                          className="project-room-number-input"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="project-room-settings-footer">
        <button
          type="button"
          onClick={props.onCloseActionClick}
          disabled={isSaving}
          className="project-secondary-button"
        >
          {strCancel}
        </button>
        <button
          type="button"
          onClick={onSaveActionClick}
          disabled={isSaving}
          className="project-primary-action"
        >
          {strSave}
        </button>
      </div>
    </section>
  );
}