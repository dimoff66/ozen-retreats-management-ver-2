'use client';

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type {
  Guest,
  GuestStatus,
  House,
  HouseMap,
  Room,
} from "@/services/database";
import type { RoomPosition } from "@/services/houseMapsService";
import guestsService from "@/services/guestsService";
import guestStatusesService from "@/services/guestStatusesService";
import houseMapsService from "@/services/houseMapsService";
import housesService from "@/services/housesService";
import roomsService from "@/services/roomsService";

type HouseMapViewProps = {
  retreatId: number;
};

export default function HouseMapView({ retreatId }: HouseMapViewProps) {
  const strLoading = "Loading...";
  const strLoadError = "Failed to load house maps.";
  const strNoMaps = "No house maps available.";
  const strBooked = "booked";
  const strCheckedIn = "checked_in";
  const strRegistered = "registered";
  const strNotComing = "not_coming";

  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houseMaps, setHouseMaps] = useState<HouseMap[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [statuses, setStatuses] = useState<GuestStatus[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [
        housesData,
        roomsData,
        mapsData,
        guestsData,
        statusesData,
      ] = await Promise.all([
        housesService.getHouses(),
        roomsService.getRooms(),
        houseMapsService.getHouseMaps(),
        guestsService.getGuestsByRetreatId(retreatId),
        guestStatusesService.getGuestStatuses(),
      ]);

      setHouses(housesData);
      setRooms(roomsData);
      setHouseMaps(mapsData);
      setGuests(guestsData);
      setStatuses(statusesData);

      if (mapsData.length > 0) {
        setSelectedMapId(mapsData[0].id);
      }
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const latestStatuses = guestStatusesService.getLatestStatuses(statuses);

  const selectedMap = houseMaps.find((item) => item.id === selectedMapId) ?? null;
  const selectedHouse = houses.find((item) => item.id === selectedMap?.house_id) ?? null;
  const roomPositions = houseMapsService.getRoomPositions(selectedMap);

  const mapTabs = houseMaps.map((houseMap) => {
    const house = houses.find((item) => item.id === houseMap.house_id);
    const label = house?.name ?? "";
    const isSelected = houseMap.id === selectedMapId;

    const onClickHandler = () => {
      setSelectedMapId(houseMap.id);
    };

    return {
      id: houseMap.id,
      label,
      isSelected,
      onClickHandler,
    };
  });

  const getGuestClassName = (status: string | null) => {
    if (status === strCheckedIn) {
      return "text-green-700";
    }

    if (status === strRegistered) {
      return "text-blue-700";
    }

    if (status === strNotComing) {
      return "text-black line-through";
    }

    return "text-gray-700";
  };

  const mapRoomItems = roomPositions
    .map((position: RoomPosition) => {
      const room = rooms.find((item) => item.id === position.room_id);

      if (!room || !selectedHouse) {
        return null;
      }

      const label = houseMapsService.getRoomLabel(room, selectedHouse, houses);
      const roomGuests = guests.filter((guest) => guest.room_id === room.id);

      const guestItems = roomGuests.map((guest) => {
        const guestStatus = latestStatuses.get(guest.id);
        const status = guestStatus?.status ?? strBooked;
        const className = getGuestClassName(status);

        return {
          id: guest.id,
          name: guest.name,
          className,
        };
      });

      const style: CSSProperties = {
        left: `${position.x}%`,
        top: `${position.y}%`,
      };

      const roomClassName = room.is_available
        ? "absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-md"
        : "absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-300 bg-gray-300 px-3 py-2 text-gray-500 shadow-md";

      return {
        id: room.id,
        label,
        guestItems,
        style,
        roomClassName,
      };
    })
    .filter((item) => item !== null);

  useEffect(() => {
    loadData();
  }, [retreatId]);

  return (
    <div className="flex h-full flex-col">
      {isLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isLoading && !isLoadError && houseMaps.length === 0 ? <div>{strNoMaps}</div> : null}
      {!isLoading && !isLoadError && houseMaps.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {mapTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClickHandler}
                className={tab.isSelected ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {selectedMap ? (
            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
              <div className="relative mx-auto w-full max-w-5xl overflow-hidden border border-gray-300 bg-white shadow-sm">
                {selectedMap.bg_image_url ? <img src={selectedMap.bg_image_url} alt={selectedHouse?.name ?? ""} className="pointer-events-none block h-auto w-full select-none" draggable={false} /> : null}
                {mapRoomItems.map((room) => (
                  <div key={room.id} style={room.style} className={room.roomClassName}>
                    <div className="text-center text-sm font-bold">{room.label}</div>
                    <div className="mt-1 flex flex-col text-xs">
                      {room.guestItems.map((guest) => (
                        <span key={guest.id} className={guest.className}>{guest.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}