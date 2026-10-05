'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import HistoryActivity from "./HistoryActivity";
import type { Guest, GuestStatus } from "@/services/database";
import dateService from "@/services/dateService";
import guestStatusesService, {
  getGuestStatusHistoryMessage,
  getPreviousGuestStatuses,
} from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

type HistoryPanelProps = {
  retreatId: number;
};

export default function HistoryPanel({ retreatId }: HistoryPanelProps) {
  const strTitle = "History";
  const strLoadError = "Failed to load retreat history.";
  const strLoading = "Loading history...";
  const strNoHistory = "No history found.";
  const strDate = "Date";
  const strActivity = "Activity";
  const strUnknown = "-";
  const [searchQuery, setSearchQuery] = useState("");
  const [statuses, setStatuses] = useState<GuestStatus[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { users } = useCurrentUser();

  useEffect(() => {
    let isCancelled = false;

    void Promise.all([
      guestStatusesService.getGuestStatusesByRetreatId(retreatId),
      guestsService.getGuestsByRetreatId(retreatId),
    ])
      .then(([statusData, guestData]) => {
        if (isCancelled) {
          return;
        }

        setStatuses(statusData);
        setGuests(guestData);
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

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const previousStatuses = getPreviousGuestStatuses(statuses);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const historyRows = statuses.map((status) => {
    const guest = guests.find((item) => item.id === status.guest_id);
    const user = users.find((item) => item.id === status.updated_by);
    const activityParts = getGuestStatusHistoryMessage(
      status,
      previousStatuses.get(status.id),
      guest?.name ?? strUnknown,
      user?.name ?? strUnknown
    );
    const date = dateService.formatDateTime(status.changed_at);
    const searchableText = `${date} ${activityParts.map((part) => part.text).join("")}`;

    return {
      id: status.id,
      date,
      activityParts,
      searchableText,
    };
  }).filter((row) => row.searchableText.toLocaleLowerCase().includes(normalizedSearch));
  const isEmpty = !isLoading && !error && historyRows.length === 0;
  const hasHistory = !isLoading && !error && historyRows.length > 0;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{strTitle}</h2>
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Search history</span>
          <input
            type="search"
            value={searchQuery}
            onChange={onSearchChange}
            aria-label="Search history"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm"
          />
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 fill-none stroke-gray-500 stroke-2">
            <circle cx="10.8" cy="10.8" r="6.3" />
            <path d="m15.5 15.5 4.2 4.2" strokeLinecap="round" />
          </svg>
        </label>
      </div>
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
