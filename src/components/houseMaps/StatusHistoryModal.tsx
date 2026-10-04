'use client';

import { useEffect, useState } from "react";
import HistoryActivity from "../history/HistoryActivity";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import type { Guest, GuestStatus } from "@/services/database";
import dateService from "@/services/dateService";
import guestStatusesService, {
  getGuestStatusHistoryMessage,
  getPreviousGuestStatuses,
} from "@/services/guestStatusesService";

export type StatusHistoryTarget =
  | {
      type: "guest";
      guestId: number;
      label: string;
    }
  | {
      type: "room";
      roomName: string;
      label: string;
    };

type StatusHistoryModalProps = {
  retreatId: number;
  target: StatusHistoryTarget;
  guests: Guest[];
  onCloseActionClick: () => void;
};

export default function StatusHistoryModal({
  retreatId,
  target,
  guests,
  onCloseActionClick,
}: StatusHistoryModalProps) {
  const strTitle = "History";
  const strDate = "Date";
  const strActivity = "Activity";
  const strClose = "Close";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load history.";
  const strNoHistory = "No history found.";
  const strUnknown = "-";

  const { users } = useCurrentUser();

  const [statuses, setStatuses] = useState<GuestStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const data = await guestStatusesService.getGuestStatusesByRetreatId(retreatId);

      setStatuses(data);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const previousStatuses = getPreviousGuestStatuses(statuses);
  const filteredStatuses = statuses.filter((status) => {
    if (target.type === "guest") {
      return status.guest_id === target.guestId;
    }

    return status.room === target.roomName;
  });
  const historyRows = filteredStatuses.map((status) => {
    const guest = guests.find((item) => item.id === status.guest_id);
    const updatedBy = users.find((item) => item.id === status.updated_by);

    return {
      id: status.id,
      date: dateService.formatDateTime(status.changed_at),
      activityParts: getGuestStatusHistoryMessage(
        status,
        previousStatuses.get(status.id),
        guest?.name ?? strUnknown,
        updatedBy?.name ?? strUnknown
      ),
    };
  });

  useEffect(() => {
    loadHistory();
  }, [retreatId, target]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold">{strTitle}</h2>
          <div className="mt-1 text-gray-600">{target.label}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? <div className="p-6">{strLoading}</div> : null}
          {isLoadError ? <div className="p-6 text-red-600">{strLoadError}</div> : null}
          {!isLoading && !isLoadError && historyRows.length === 0 ? (
            <div className="p-6 text-gray-500">{strNoHistory}</div>
          ) : null}
          {!isLoading && !isLoadError && historyRows.length > 0 ? (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{strDate}</th>
                  <th className="px-4 py-3 text-left">{strActivity}</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3"><HistoryActivity parts={row.activityParts} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex justify-end">
            <button type="button" onClick={onCloseActionClick} className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
              {strClose}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}