'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import HistoryActivity from "./HistoryActivity";
import type { Guest, GuestStatus, House, Room } from "@/services/database";
import dateService from "@/services/dateService";
import guestStatusesService, {
  getGuestStatusHistoryMessage,
  getPreviousGuestStatuses,
} from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import housesService from "@/services/housesService";
import roomsService from "@/services/roomsService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export type HistoryFilter =
  | { type: "guest"; guestId: number }
  | { type: "room"; roomName: string };

type HistoryPanelProps = {
  retreatId: number;
  filter?: HistoryFilter;
};

export default function HistoryPanel({ retreatId, filter }: HistoryPanelProps) {
  const strTitle = "History";
  const strFilter = "Filter by guest or room";
  const strAllHistory = "All history";
  const strGuests = "Guests";
  const strRooms = "Rooms";
  const strLoadError = "Failed to load retreat history.";
  const strLoading = "Loading history...";
  const strNoHistory = "No history found.";
  const strDate = "Date";
  const strActivity = "Activity";
  const strUnknown = "-";
  const [statuses, setStatuses] = useState<GuestStatus[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<HistoryFilter | null>(filter ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { users } = useCurrentUser();

  useEffect(() => {
    let isCancelled = false;

    void Promise.all([
      guestStatusesService.getGuestStatusesByRetreatId(retreatId),
      guestsService.getGuestsByRetreatId(retreatId),
      housesService.getHouses(),
      roomsService.getRooms(),
    ])
      .then(([statusData, guestData, houseData, roomData]) => {
        if (isCancelled) {
          return;
        }

        setStatuses(statusData);
        setGuests(guestData);
        setHouses(houseData);
        setRooms(roomsService.sortRooms(roomData, houseData));
        setError("");
      })
      .catch(() => {
        if (!isCancelled) {
          setError(strLoadError);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [retreatId]);

  const onFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (value === "") {
      setSelectedFilter(null);
      return;
    }

    if (value.startsWith("guest:")) {
      setSelectedFilter({ type: "guest", guestId: Number(value.slice(6)) });
      return;
    }

    setSelectedFilter({ type: "room", roomName: value.slice(5) });
  };

  const roomNames = Array.from(new Set([
    ...rooms.flatMap((room) => {
      const house = houses.find((item) => item.id === room.house_id);

      return house ? [roomsService.getRoomDisplayName(room, house)] : [];
    }),
    ...statuses.flatMap((status) => status.room ? [status.room] : []),
  ])).sort((left, right) => left.localeCompare(right));

  const filteredStatuses = statuses.filter((status) => {
    if (!selectedFilter) {
      return true;
    }

    if (selectedFilter.type === "guest") {
      return status.guest_id === selectedFilter.guestId;
    }

    return status.room === selectedFilter.roomName;
  });

  const selectedFilterValue = selectedFilter
    ? selectedFilter.type === "guest"
      ? `guest:${selectedFilter.guestId}`
      : `room:${selectedFilter.roomName}`
    : "";
  const guestOptions = guests.map((guest) => ({
    id: guest.id,
    value: `guest:${guest.id}`,
    name: guest.name,
  }));
  const roomOptions = roomNames.map((roomName) => ({
    id: roomName,
    value: `room:${roomName}`,
    name: roomName,
  }));
  const previousStatuses = getPreviousGuestStatuses(statuses);
  const historyRows = filteredStatuses.map((status) => {
    const guest = guests.find((item) => item.id === status.guest_id);
    const user = users.find((item) => item.id === status.updated_by);

    return {
      id: status.id,
      date: dateService.formatDateTime(status.changed_at),
      activityParts: getGuestStatusHistoryMessage(
        status,
        previousStatuses.get(status.id),
        guest?.name ?? strUnknown,
        user?.name ?? strUnknown
      ),
    };
  });
  const isEmpty = !isLoading && !error && historyRows.length === 0;
  const hasHistory = !isLoading && !error && historyRows.length > 0;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{strTitle}</h2>
      <label className="mb-4 block max-w-lg text-sm font-medium">
        {strFilter}
        <select
          value={selectedFilterValue}
          onChange={onFilterChange}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        >
          <option value="">{strAllHistory}</option>
          <optgroup label={strGuests}>
            {guestOptions.map((guest) => (
              <option key={guest.id} value={guest.value}>{guest.name}</option>
            ))}
          </optgroup>
          <optgroup label={strRooms}>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.value}>{room.name}</option>
            ))}
          </optgroup>
        </select>
      </label>
      {error ? <p role="alert" className="mb-4 text-red-600">{error}</p> : null}
      {isLoading ? <p>{strLoading}</p> : null}
      {isEmpty ? <p className="text-gray-500">{strNoHistory}</p> : null}
      {hasHistory ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">{strDate}</th>
                <th className="px-4 py-3 text-left">{strActivity}</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="whitespace-nowrap px-4 py-3">{row.date}</td>
                  <td className="px-4 py-3"><HistoryActivity parts={row.activityParts} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
