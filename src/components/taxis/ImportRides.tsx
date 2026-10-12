'use client';

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, DragEvent } from "react";
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

type CapabilitiesResponse = {
  imageImportAvailable: boolean;
};

type ImportInputTab = "image" | "text";

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
  return leftParts.some(part => rightSet.has(part));
};

export default function ImportRides(props: ImportRidesProps) {
  const strTitle = "Import taxi rides";
  const strExistingWarning = "All existing taxi rides for this retreat will be deleted when the import is saved.";
  const strInputHelp = "Paste tab-separated data with columns: group, approxTime, name, time, houseCode.";
  const strImageTab = "Image";
  const strTextTab = "Text";
  const strImageSection = "Extract the table from an image.";
  const strImageHint = "Paste an image with Ctrl+V, drag it here, or choose a file.";
  const strChooseImage = "Choose image";
  const strRemoveImage = "Remove image";
  const strExtractText = "Extract text";
  const strExtractingText = "Extracting...";
  const strImageNotConfigured = "Image import is unavailable because REPLICATE_API_TOKEN is not configured.";
  const strImageEmpty = "Select an image before extracting text.";
  const strImageExtractError = "Failed to extract text from the image.";
  const strSelectedImage = "Selected image";
  const strSkipImage = "Skip image";
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
  const [inputTab, setInputTab] = useState<ImportInputTab>("image");
  const [isImageImportAvailable, setIsImageImportAvailable] = useState(false);
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [isExtractingText, setIsExtractingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const guests = snapshot?.guests ?? [];
  const rooms = snapshot?.rooms ?? [];
  const houses = snapshot?.houses ?? [];
  const hasExistingRides = (snapshot?.taxiRides.length ?? 0) > 0;

  useEffect(() => {
    let isMounted = true;

    const loadCapabilities = async () => {
      try {
        const response = await fetch("/api/taxi-import/capabilities", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load capabilities");
        }

        const data = await response.json() as CapabilitiesResponse;

        if (isMounted) {
          const imageImportAvailable = Boolean(data.imageImportAvailable);
          setIsImageImportAvailable(imageImportAvailable);

          if (!imageImportAvailable) {
            setInputTab("text");
          }
        }
      } catch {
        if (isMounted) {
          setIsImageImportAvailable(false);
          setInputTab("text");
        }
      } finally {
        if (isMounted) {
          setIsCheckingCapabilities(false);
        }
      }
    };

    void loadCapabilities();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImageUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setSelectedImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

  const getGuestRoomLabel = (guest: Guest): string => {
    if (!guest.room_id) {
      return "-";
    }

    const room = rooms.find(item => item.id === guest.room_id);
    const house = room ? houses.find(item => item.id === room.house_id) : undefined;

    return room && house ? roomsService.getRoomDisplayName(room, house) : "-";
  };

  const guestMatchData: GuestMatchData[] = guests.map(guest => ({
    guest,
    normalizedName: normalizeName(guest.name),
    nameParts: getNameParts(guest.name),
    roomLabel: getGuestRoomLabel(guest),
  }));

  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setError("");
  };

  const setImageFile = (file: File | null) => {
    setSelectedImage(file);
    setError("");
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  };

  const onChooseImageClick = () => {
    fileInputRef.current?.click();
  };

  const onRemoveImageClick = () => {
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onImagePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find(item => item.type.startsWith("image/"));

    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    setImageFile(file);
  };

  const onImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;

    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setImageFile(file);
  };

  const onImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onImageTabClick = () => {
    setInputTab("image");
    setError("");
  };

  const onTextTabClick = () => {
    setInputTab("text");
    setError("");
  };

  const onSkipImageClick = () => {
    setInputTab("text");
    setError("");
  };

  const onExtractTextClick = async () => {
    if (isExtractingText) {
      return;
    }

    if (!isImageImportAvailable) {
      setError(strImageNotConfigured);
      return;
    }

    if (!selectedImage) {
      setError(strImageEmpty);
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedImage);

    setIsExtractingText(true);
    setError("");

    try {
      const response = await fetch("/api/taxi-import/extract", {
        method: "POST",
        body: formData,
      });
      const data = await response.json() as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        setError(data.error || strImageExtractError);
        return;
      }

      setText(data.text);
      setInputTab("text");
    } catch {
      setError(strImageExtractError);
    } finally {
      setIsExtractingText(false);
    }
  };

  const onNextClick = () => {
    if (!retreat) {
      return;
    }

    const sourceLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (sourceLines.length === 0) {
      setError(strNoData);
      return;
    }

    const firstCells = sourceLines[0].split("\t").map(cell => cell.trim().toLocaleLowerCase());
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
      const cells = line.split("\t").map(cell => cell.trim());
      const rowNumber = index + 1;

      if (cells.length < 5) {
        validationErrors.push(`Row ${rowNumber}: ${strInvalidColumns}`);
        return;
      }

      const groupMatch = cells[0].match(/^\s*(\d+)/);
      const group = groupMatch ? Number(groupMatch[1]) : Number.NaN;

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

    parsedRows.forEach(row => {
      const normalizedName = normalizeName(row.name);
      const exactMatches = guestMatchData.filter(item => item.normalizedName === normalizedName);

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

    const matchedRows: MatchedImportRow[] = parsedRows.map(row => {
      const nameParts = getNameParts(row.name);
      const exactGuestId = exactGuestByRowId.get(row.id) ?? null;
      const partialMatches = exactGuestId === null
        ? guestMatchData.filter(item => (
          !exactMatchedGuestIds.has(item.guest.id) && shareNamePart(nameParts, item.nameParts)
        ))
        : [];

      return {
        ...row,
        matchedGuestId: exactGuestId,
        suggestionGuestIds: Array.from(new Set(partialMatches.map(item => item.guest.id))),
      };
    });
    const groupNumbers = Array.from(new Set(matchedRows.map(row => row.group))).sort((left, right) => left - right);
    const nextGroups = groupNumbers.map(groupNumber => {
      const rows = matchedRows.filter(row => row.group === groupNumber);
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
    const existingMatch = groups.flatMap(group => group.rows.map(row => ({ group: group.group, row })))
      .find(item => item.row.id !== rowId && item.row.matchedGuestId === guestId);

    if (existingMatch) {
      setError(`${strAlreadyAssigned} ${strTaxi} ${existingMatch.group}.`);
      return;
    }

    setGroups(currentGroups => currentGroups.map(group => ({
      ...group,
      rows: group.rows.map(row => {
        if (row.id !== rowId) {
          return row;
        }

        const nextSuggestions = row.suggestionGuestIds.filter(id => id !== guestId);

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
      .map(group => ({
        arrival_datetime: group.arrivalDateTime,
        driver_name: null,
        guests: group.rows.map(row => ({
          guest_id: row.matchedGuestId,
          unbooked_guest_name: row.matchedGuestId === null ? row.name : null,
        })),
      }));

    setIsSaving(true);
    setError("");

    try {
      await taxiRidesService.createRides(retreat.id, rides);
      await refresh();
      props.onCloseActionClick();
    } catch {
      setError(strSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedGroup = groups.find(group => group.group === selectedGroupNumber) ?? groups[0] ?? null;
  const groupCards = groups.map(group => {
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
  const previewRows = (selectedGroup?.rows ?? []).map(row => {
    const matchedGuest = row.matchedGuestId === null
      ? null
      : guestMatchData.find(item => item.guest.id === row.matchedGuestId) ?? null;
    const suggestions = row.suggestionGuestIds.flatMap(guestId => {
      const guestData = guestMatchData.find(item => item.guest.id === guestId);

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
    <div className="project-modal-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="import-rides-title" className="project-import-rides-modal">
        <div className="project-form-modal-header">
          <h3 id="import-rides-title">{strTitle}</h3>
        </div>
        {!isPreview ? (
          <div className="project-import-rides-body">
            {hasExistingRides && <p className="project-import-warning">{strExistingWarning}</p>}
            {!isCheckingCapabilities && isImageImportAvailable && (
              <div className="project-import-input-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={inputTab === "image"} onClick={onImageTabClick} className={inputTab === "image" ? "project-import-input-tab project-import-input-tab-active" : "project-import-input-tab"}>{strImageTab}</button>
                <button type="button" role="tab" aria-selected={inputTab === "text"} onClick={onTextTabClick} className={inputTab === "text" ? "project-import-input-tab project-import-input-tab-active" : "project-import-input-tab"}>{strTextTab}</button>
              </div>
            )}
            {!isCheckingCapabilities && isImageImportAvailable && inputTab === "image" && (
              <div className="project-import-image-section">
                <span className="project-import-image-title">{strImageSection}</span>
                <div
                  tabIndex={0}
                  onPaste={onImagePaste}
                  onDrop={onImageDrop}
                  onDragOver={onImageDragOver}
                  className="project-import-image-dropzone"
                >
                  <span>{strImageHint}</span>
                  <div className="project-import-image-actions">
                    <button type="button" onClick={onChooseImageClick} className="project-action-button project-action-button-secondary">{strChooseImage}</button>
                    <button type="button" onClick={onExtractTextClick} disabled={!selectedImage || isExtractingText} className="project-action-button project-action-button-primary">{isExtractingText ? strExtractingText : strExtractText}</button>
                    {selectedImage && <button type="button" onClick={onRemoveImageClick} className="project-action-button project-action-button-secondary">{strRemoveImage}</button>}
                    <button type="button" onClick={onSkipImageClick} className="project-action-button project-action-button-secondary">{strSkipImage}</button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/jpg" onChange={onFileInputChange} className="project-import-image-input" />
                  {selectedImage && <span className="project-import-image-name">{selectedImage.name}</span>}
                </div>
                {selectedImageUrl && (
                  <div className="project-import-image-preview-wrap">
                    <span className="project-import-image-preview-label">{strSelectedImage}</span>
                    <img src={selectedImageUrl} alt={strSelectedImage} className="project-import-image-preview" />
                  </div>
                )}
                {error && <pre role="alert" className="project-import-error">{error}</pre>}
              </div>
            )}
            {!isCheckingCapabilities && (!isImageImportAvailable || inputTab === "text") && (
              <label className="project-form-field project-import-text-field">
                <span>{strInputHelp}</span>
                <textarea value={text} onChange={onTextChange} rows={18} spellCheck={false} />
              </label>
            )}
            {!isCheckingCapabilities && !isImageImportAvailable && <p className="project-import-image-disabled-note">{strImageNotConfigured}</p>}
            {!isCheckingCapabilities && (!isImageImportAvailable || inputTab === "text") && error && <pre role="alert" className="project-import-error">{error}</pre>}
          </div>
        ) : (
          <div className="project-import-rides-body project-import-preview-body">
            <div className="project-taxi-grid project-import-taxi-grid">
              {groupCards.map(group => (
                <button
                  key={group.group}
                  type="button"
                  onClick={group.onSelect}
                  className={group.isSelected ? "project-taxi-card project-taxi-card-selected project-import-taxi-card" : "project-taxi-card project-import-taxi-card"}
                >
                  <span className="project-taxi-number">{group.number}</span>
                  <strong>{group.time}</strong>
                  <span className="project-taxi-date">{group.date}</span>
                  <span className="project-taxi-passenger-count">{group.guestCount}</span>
                </button>
              ))}
            </div>
            {selectedGroup && (
              <div className="project-import-table-wrap">
                <table className="project-data-table project-import-table">
                  <thead>
                    <tr>
                      <th>{strImportedName}</th>
                      <th>{strImportedRoom}</th>
                      <th>{strMatchedGuest}</th>
                      <th>{strSuggestions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(row => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.roomLabel}</td>
                        <td>
                          {row.matchedGuest ? (
                            <span className="project-import-guest-badge">
                              <strong>{row.matchedGuest.guest.name}</strong>
                              <small>{row.matchedGuest.roomLabel}</small>
                            </span>
                          ) : <span className="project-import-empty-match">{strNoMatch}</span>}
                        </td>
                        <td>
                          <div className="project-import-suggestions">
                            {row.suggestions.map(guest => (
                              <button key={guest.id} type="button" onClick={guest.onSelect} className="project-import-guest-badge project-import-guest-suggestion">
                                <strong>{guest.name}</strong>
                                <small>{guest.roomLabel}</small>
                              </button>
                            ))}
                            {row.suggestions.length === 0 && <span className="project-import-empty-match">{strNoSuggestions}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {error && <pre role="alert" className="project-import-error">{error}</pre>}
          </div>
        )}
        <div className="project-form-footer">
          <div className="project-form-footer-actions">
            <button type="button" onClick={props.onCloseActionClick} className="project-action-button project-action-button-secondary">{strCancel}</button>
            {isPreview && <button type="button" onClick={onBackClick} className="project-action-button project-action-button-secondary">{strBack}</button>}
            {isPreview ? (
              <button type="button" onClick={onSaveClick} disabled={isSaving} className="project-action-button project-action-button-primary">{isSaving ? strSaving : strSave}</button>
            ) : !isCheckingCapabilities && (!isImageImportAvailable || inputTab === "text") && (
              <button type="button" onClick={onNextClick} className="project-action-button project-action-button-primary">{strNext}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
