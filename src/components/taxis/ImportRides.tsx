'use client';

import { useState } from "react";
import type { ChangeEvent } from "react";
import { useRetreat } from "@/contexts/RetreatContext";
import type { CreateTaxiRideBatch, Guest } from "@/services/database";
import dateService from "@/services/dateService";
import roomsService from "@/services/roomsService";
import taxiRidesService from "@/services/taxiRidesService";

type ImportRidesProps = {
  onCloseActionClick: () => void;
};

type ParsedImportRow = {
  id: number;
  group: number;
  approxTime: string;
  name: string;
  sourceTime: string;
  roomLabel: string;
};

type MatchedImportRow = ParsedImportRow & {
  matchedGuestId: number | null;
  suggestionGuestIds: number[];
};

type ImportRideGroup = {
  group: number;
  approxTime: string;
  arrivalDateTime: string;
  rows: MatchedImportRow[];
};

type GuestMatchData = {
  guest: Guest;
  normalizedName: string;
  nameParts: string[];
  roomLabel: string;
};

const normalizeName = (name: string): string => {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, " ");
};

const getNameParts = (name: string): string[] => {
  return normalizeName(name).split(" ").filter(Boolean);
};

const parseClockTime = (value: string): { label: string; minutes: number } | null => {
  const match = value.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return {
    label: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    minutes: hours * 60 + minutes,
  };
};

const formatClockMinutes = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutePart = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
};

const normalizeImportedRoom = (value: string): string => {
  const room = value.trim().replace(/\s+/g, " ");
  const lowerRoom = room.toLocaleLowerCase();

  if (lowerRoom.startsWith("cubo ")) {
    return `Cube ${room.slice(5).trim()}`;
  }

  if (lowerRoom.startsWith("cono ")) {
    return `Cone ${room.slice(5).trim()}`;
  }

  return room.replace(/\s+/g, "");
};

const shareNamePart = (leftParts: string[], rightParts: string[]): boolean => {
  const rightSet = new Set(rightParts);
  return leftParts.some((part) => rightSet.has(part));
};

export default function ImportRides({ onCloseActionClick }: ImportRidesProps) {
  const strTitle = "Import taxi rides";
  const strExistingWarning = "All existing taxi rides for this retreat will be deleted when the import is saved.";
  const strInputHelp = "Paste tab-separated data with columns: group, approxTime, name, time, houseCode.";
  const strNext = "Next";
  const strBack = "Back";
  const strCancel = "Cancel";
  const strSave = "Save";
  const strSaving = "Saving...";
  const strNoData = "Paste taxi data before continuing.";
  const strInvalidColumns = "Expected 5 tab-separated columns.";
  const strInvalidGroup = "Invalid taxi group.";
  const strInvalidApproxTime = "Invalid approxTime.";
  const strInvalidSourceTime = "Invalid time.";
  const strImportedName = "Name";
  const strImportedRoom = "Room";
  const strMatchedGuest = "Matched guest";
  const strSuggestions = "Suggestions";
  const strNoMatch = "No match";
  const strNoSuggestions = "No suggestions";
  const strTaxi = "Taxi";
  const strGuests = "guests";
  const strAlreadyAssigned = "This guest is already assigned to another imported taxi row.";
  const strSaveError = "Failed to import taxi rides.";
  const { retreat, snapshot, refresh } = useRetreat();
  const [text, setText] = useState("");
  const [groups, setGroups] = useState<ImportRideGroup[]>([]);
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<number | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const guests = snapshot?.guests ?? [];
  const rooms = snapshot?.rooms ?? [];
  const houses = snapshot?.houses ?? [];
  const hasExistingRides = (snapshot?.taxiRides.length ?? 0) > 0;

  const getGuestRoomLabel = (guest: Guest): string => {
    if (!guest.room_id) {
      return "-";
    }

    const room = rooms.find((item) => item.id === guest.room_id);
    const house = room ? houses.find((item) => item.id === room.house_id) : undefined;

    return room && house ? roomsService.getRoomDisplayName(room, house) : "-";
  };

  const guestMatchData: GuestMatchData[] = guests.map((guest) => ({
    guest,
    normalizedName: normalizeName(guest.name),
    nameParts: getNameParts(guest.name),
    roomLabel: getGuestRoomLabel(guest),
  }));

  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setError("");
  };

  const onNextClick = () => {
    if (!retreat) {
      return;
    }

    const sourceLines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (sourceLines.length === 0) {
      setError(strNoData);
      return;
    }

    const firstCells = sourceLines[0].split("\t").map((cell) => cell.trim().toLocaleLowerCase());
    const lines = firstCells[0] === "group" && firstCells[2] === "name"
      ? sourceLines.slice(1)
      : sourceLines;
    const parsedRows: ParsedImportRow[] = [];
    const validationErrors: string[] = [];
    const groupTimes = new Map<number, string>();
    const groupApproxMinutes = new Map<number, number>();
    const groupLatestSourceTimes = new Map<number, { label: string; minutes: number }>();
    const seenGroups = new Set<number>();

    lines.forEach((line, index) => {
      const cells = line.split("\t").map((cell) => cell.trim());
      const rowNumber = index + 1;

      if (cells.length < 5) {
        validationErrors.push(`Row ${rowNumber}: ${strInvalidColumns}`);
        return;
      }

      const group = Number(cells[0]);

      if (!Number.isInteger(group) || group <= 0) {
        validationErrors.push(`Row ${rowNumber}: ${strInvalidGroup}`);
        return;
      }

      const isFirstGroupRow = !seenGroups.has(group);
      let approxTimeLabel = groupTimes.get(group);

      if (isFirstGroupRow) {
        seenGroups.add(group);
        const approxTime = parseClockTime(cells[1]);

        if (!approxTime) {
          validationErrors.push(`Row ${rowNumber} (${cells[2]}): ${strInvalidApproxTime}`);
        } else {
          approxTimeLabel = approxTime.label;
          groupTimes.set(group, approxTime.label);
          groupApproxMinutes.set(group, approxTime.minutes);
        }
      }

      const sourceTime = parseClockTime(cells[3]);

      if (!sourceTime) {
        validationErrors.push(`Row ${rowNumber} (${cells[2]}): ${strInvalidSourceTime}`);
        return;
      }

      const latestSourceTime = groupLatestSourceTimes.get(group);

      if (!latestSourceTime || sourceTime.minutes > latestSourceTime.minutes) {
        groupLatestSourceTimes.set(group, sourceTime);
      }

      if (!approxTimeLabel) {
        return;
      }

      parsedRows.push({
        id: index + 1,
        group,
        approxTime: approxTimeLabel,
        name: cells[2],
        sourceTime: sourceTime.label,
        roomLabel: normalizeImportedRoom(cells[4]),
      });
    });

    groupApproxMinutes.forEach((approxMinutes, group) => {
      const latestSourceTime = groupLatestSourceTimes.get(group);

      if (!latestSourceTime) {
        return;
      }

      const difference = approxMinutes - latestSourceTime.minutes;

      if (difference < 30 || difference > 90) {
        const minimum = formatClockMinutes(latestSourceTime.minutes + 30);
        const maximum = formatClockMinutes(latestSourceTime.minutes + 90);
        validationErrors.push(
          `Taxi ${group}: latest time ${latestSourceTime.label} → approxTime ${groupTimes.get(group)}. Expected approxTime between ${minimum} and ${maximum}.`
        );
      }
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join("\n"));
      return;
    }

    const exactGuestByRowId = new Map<number, number>();
    const exactMatchedGuestIds = new Set<number>();

    parsedRows.forEach((row) => {
      const normalizedName = normalizeName(row.name);
      const exactMatches = guestMatchData.filter((item) => item.normalizedName === normalizedName);

      if (exactMatches.length !== 1) {
        return;
      }

      const guestId = exactMatches[0].guest.id;

      if (exactMatchedGuestIds.has(guestId)) {
        return;
      }

      exactGuestByRowId.set(row.id, guestId);
      exactMatchedGuestIds.add(guestId);
    });

    const matchedRows: MatchedImportRow[] = parsedRows.map((row) => {
      const nameParts = getNameParts(row.name);
      const exactGuestId = exactGuestByRowId.get(row.id) ?? null;
      const partialMatches = exactGuestId === null
        ? guestMatchData.filter((item) => (
          !exactMatchedGuestIds.has(item.guest.id) && shareNamePart(nameParts, item.nameParts)
        ))
        : [];

      return {
        ...row,
        matchedGuestId: exactGuestId,
        suggestionGuestIds: Array.from(new Set(partialMatches.map((item) => item.guest.id))),
      };
    });
    const groupNumbers = Array.from(new Set(matchedRows.map((row) => row.group))).sort((left, right) => left - right);
    const nextGroups = groupNumbers.map((groupNumber) => {
      const rows = matchedRows.filter((row) => row.group === groupNumber);
      const approxTime = rows[0]?.approxTime ?? "00:00";
      const localDate = new Date(`${retreat.start_date}T${approxTime}:00`);

      return {
        group: groupNumber,
        approxTime,
        arrivalDateTime: localDate.toISOString(),
        rows,
      };
    });

    setGroups(nextGroups);
    setSelectedGroupNumber(nextGroups[0]?.group ?? null);
    setError("");
    setIsPreview(true);
  };

  const onBackClick = () => {
    setIsPreview(false);
    setError("");
  };

  const onSuggestionClick = (rowId: number, guestId: number) => {
    const existingMatch = groups.flatMap((group) => group.rows.map((row) => ({ group: group.group, row })))
      .find((item) => item.row.id !== rowId && item.row.matchedGuestId === guestId);

    if (existingMatch) {
      setError(`${strAlreadyAssigned} ${strTaxi} ${existingMatch.group}.`);
      return;
    }

    setGroups((currentGroups) => currentGroups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const nextSuggestions = row.suggestionGuestIds.filter((id) => id !== guestId);

        if (row.matchedGuestId !== null && !nextSuggestions.includes(row.matchedGuestId)) {
          nextSuggestions.push(row.matchedGuestId);
        }

        return {
          ...row,
          matchedGuestId: guestId,
          suggestionGuestIds: nextSuggestions,
        };
      }),
    })));
    setError("");
  };

  const onSaveClick = async () => {
    if (!retreat || isSaving) {
      return;
    }

    const rides: CreateTaxiRideBatch[] = groups
      .slice()
      .sort((left, right) => left.group - right.group)
      .map((group) => ({
        arrival_datetime: group.arrivalDateTime,
        driver_name: null,
        guests: group.rows.map((row) => ({
          guest_id: row.matchedGuestId,
          unbooked_guest_name: row.matchedGuestId === null ? row.name : null,
        })),
      }));

    setIsSaving(true);
    setError("");

    try {
      await taxiRidesService.createRides(retreat.id, rides);
      await refresh();
      onCloseActionClick();
    } catch {
      setError(strSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedGroup = groups.find((group) => group.group === selectedGroupNumber) ?? groups[0] ?? null;
  const groupCards = groups.map((group) => {
    const onSelect = () => {
      setSelectedGroupNumber(group.group);
      setError("");
    };

    return {
      group: group.group,
      number: `${strTaxi} ${group.group}`,
      time: group.approxTime,
      date: retreat ? dateService.formatDate(retreat.start_date) : "",
      guestCount: `${group.rows.length} ${strGuests}`,
      isSelected: selectedGroup?.group === group.group,
      onSelect,
    };
  });
  const previewRows = (selectedGroup?.rows ?? []).map((row) => {
    const matchedGuest = row.matchedGuestId === null
      ? null
      : guestMatchData.find((item) => item.guest.id === row.matchedGuestId) ?? null;
    const suggestions = row.suggestionGuestIds.flatMap((guestId) => {
      const guestData = guestMatchData.find((item) => item.guest.id === guestId);

      if (!guestData) {
        return [];
      }

      const onSelect = () => {
        onSuggestionClick(row.id, guestId);
      };

      return [{
        id: guestId,
        name: guestData.guest.name,
        roomLabel: guestData.roomLabel,
        onSelect,
      }];
    });

    return {
      id: row.id,
      name: row.name,
      roomLabel: row.roomLabel,
      matchedGuest,
      suggestions,
    };
  });

  return (
    <div className="ozen-modal-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="import-rides-title" className="ozen-import-rides-modal">
        <div className="ozen-form-modal-header">
          <h3 id="import-rides-title">{strTitle}</h3>
        </div>
        {!isPreview ? (
          <div className="ozen-import-rides-body">
            {hasExistingRides ? <p className="ozen-import-warning">{strExistingWarning}</p> : null}
            <label className="ozen-form-field ozen-import-text-field">
              <span>{strInputHelp}</span>
              <textarea value={text} onChange={onTextChange} rows={18} spellCheck={false} />
            </label>
            {error ? <pre role="alert" className="ozen-import-error">{error}</pre> : null}
          </div>
        ) : (
          <div className="ozen-import-rides-body ozen-import-preview-body">
            <div className="ozen-taxi-grid ozen-import-taxi-grid">
              {groupCards.map((group) => (
                <button
                  key={group.group}
                  type="button"
                  onClick={group.onSelect}
                  className={group.isSelected ? "ozen-taxi-card ozen-taxi-card-selected ozen-import-taxi-card" : "ozen-taxi-card ozen-import-taxi-card"}
                >
                  <span className="ozen-taxi-number">{group.number}</span>
                  <strong>{group.time}</strong>
                  <span className="ozen-taxi-date">{group.date}</span>
                  <span className="ozen-taxi-passenger-count">{group.guestCount}</span>
                </button>
              ))}
            </div>
            {selectedGroup ? (
              <div className="ozen-import-table-wrap">
                <table className="ozen-data-table ozen-import-table">
                  <thead>
                    <tr>
                      <th>{strImportedName}</th>
                      <th>{strImportedRoom}</th>
                      <th>{strMatchedGuest}</th>
                      <th>{strSuggestions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.roomLabel}</td>
                        <td>
                          {row.matchedGuest ? (
                            <span className="ozen-import-guest-badge">
                              <strong>{row.matchedGuest.guest.name}</strong>
                              <small>{row.matchedGuest.roomLabel}</small>
                            </span>
                          ) : <span className="ozen-import-empty-match">{strNoMatch}</span>}
                        </td>
                        <td>
                          <div className="ozen-import-suggestions">
                            {row.suggestions.map((guest) => (
                              <button key={guest.id} type="button" onClick={guest.onSelect} className="ozen-import-guest-badge ozen-import-guest-suggestion">
                                <strong>{guest.name}</strong>
                                <small>{guest.roomLabel}</small>
                              </button>
                            ))}
                            {row.suggestions.length === 0 ? <span className="ozen-import-empty-match">{strNoSuggestions}</span> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {error ? <pre role="alert" className="ozen-import-error">{error}</pre> : null}
          </div>
        )}
        <div className="ozen-form-footer">
          <div className="ozen-form-footer-actions">
            <button type="button" onClick={onCloseActionClick} className="ozen-action-button ozen-action-button-secondary">{strCancel}</button>
            {isPreview ? <button type="button" onClick={onBackClick} className="ozen-action-button ozen-action-button-secondary">{strBack}</button> : null}
            {isPreview ? (
              <button type="button" onClick={onSaveClick} disabled={isSaving} className="ozen-action-button ozen-action-button-primary">{isSaving ? strSaving : strSave}</button>
            ) : (
              <button type="button" onClick={onNextClick} className="ozen-action-button ozen-action-button-primary">{strNext}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
