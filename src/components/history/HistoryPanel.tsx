'use client';

import { useState } from "react";
import type { ChangeEvent } from "react";
import HistoryActivity from "./HistoryActivity";
import dateService from "@/services/dateService";
import {
  getGuestStatusHistoryMessage,
  getPreviousGuestStatuses,
} from "@/services/guestStatusesService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useRetreat } from "@/contexts/RetreatContext";

type HistoryPanelProps = {
  showTitle?: boolean;
};

export default function HistoryPanel({ showTitle = true }: HistoryPanelProps) {
  const strTitle = "History";
  const strLoadError = "Failed to load retreat history.";
  const strLoading = "Loading history...";
  const strNoHistory = "No history found.";
  const strDate = "Date";
  const strActivity = "Activity";
  const strUnknown = "-";
  const [searchQuery, setSearchQuery] = useState("");
  const { users } = useCurrentUser();
  const { snapshot, isLoading, error: retreatError } = useRetreat();
  const statuses = snapshot?.statuses ?? [];
  const guests = snapshot?.guests ?? [];
  const error = retreatError ? strLoadError : "";

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
  const isSnapshotLoading = isLoading || !snapshot;
  const isEmpty = !isSnapshotLoading && !error && historyRows.length === 0;
  const hasHistory = !isSnapshotLoading && !error && historyRows.length > 0;

  return (
    <section className="ozen-history-screen">
      <div className="ozen-section-toolbar">
        {showTitle ? <div><h2>{strTitle}</h2></div> : <span />}
        <label className="ozen-search-field ozen-history-search">
          <span className="sr-only">Search history</span>
          <input type="search" value={searchQuery} onChange={onSearchChange} aria-label="Search history" />
          <svg aria-hidden="true" viewBox="0 0 24 24" className="ozen-search-icon">
            <circle cx="10.8" cy="10.8" r="6.3" />
            <path d="m15.5 15.5 4.2 4.2" strokeLinecap="round" />
          </svg>
        </label>
      </div>
      {error ? <p role="alert" className="ozen-state-message ozen-state-error">{error}</p> : null}
      {isSnapshotLoading ? <p className="ozen-state-message">{strLoading}</p> : null}
      {isEmpty ? <p className="ozen-empty-message">{strNoHistory}</p> : null}
      {hasHistory ? (
        <div className="ozen-table-panel">
          <table className="ozen-data-table ozen-history-table">
            <thead>
              <tr>
                <th>{strDate}</th>
                <th>{strActivity}</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.id}>
                  <td className="ozen-history-date">{row.date}</td>
                  <td><HistoryActivity parts={row.activityParts} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
