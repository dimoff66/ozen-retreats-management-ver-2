import { useState } from "react";
import type { Guest } from "@/services/database";

export type GuestCardRow = {
  guest: Guest;
  roomName: string;
  taxiNumber: string;
  statusLabel: string;
  isPending: boolean;
  showStatus: boolean;
  fallbackCaption: string;
};

export type GuestCardActionButton = {
  caption: string;
  action: () => void;
};

export type GuestCardGroup = {
  groupLabel: string;
  groupIndex: number;
  actionButton: GuestCardActionButton | null;
};

type GuestsCardsProps<T extends GuestCardRow> = {
  guests: T[];
  getGuestCardGroup?: (
    guest: T,
    index: number,
    guests: T[]
  ) => GuestCardGroup | null;
  emptyMessage: string;
};

export default function GuestsCards<T extends GuestCardRow>({
  guests,
  getGuestCardGroup,
  emptyMessage,
}: GuestsCardsProps<T>) {
  const [searchText, setSearchText] = useState("");
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  const groups = new Map<
    string,
    { label: string; index: number; rows: { guest: T; actionButton: GuestCardActionButton | null }[] }
  >();

  guests.forEach((guest, index) => {
    const grouping = getGuestCardGroup?.(guest, index, guests);
    const matchesSearch = normalizedSearchText.length > 0
      && guest.guest.name.toLocaleLowerCase().includes(normalizedSearchText);
    const groupLabel = matchesSearch
      ? `search '${searchText.trim()}'`
      : getGuestCardGroup
        ? grouping?.groupLabel ?? "others"
        : "";
    const groupIndex = matchesSearch
      ? Number.MIN_SAFE_INTEGER
      : getGuestCardGroup
        ? grouping?.groupIndex ?? Number.MAX_SAFE_INTEGER
        : 0;
    const actionButton = grouping?.actionButton ?? null;
    const groupKey = `${groupIndex}:${groupLabel}`;
    const group = groups.get(groupKey);
    const row = { guest, actionButton };

    if (group) {
      group.rows.push(row);
    } else {
      groups.set(groupKey, {
        label: groupLabel,
        index: groupIndex,
        rows: [row],
      });
    }
  });

  const sortedGroups = [...groups.values()].sort((left, right) =>
    left.index - right.index || left.label.localeCompare(right.label)
  );

  return (
    <div className="mt-5">
      <label className="mb-4 block max-w-md text-sm font-medium">
        Search guests
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
      {guests.length === 0 ? <p className="text-gray-600">{emptyMessage}</p> : (
        <div className="space-y-5">
          {sortedGroups.map((group) => (
            <section key={`${group.index}:${group.label}`}>
              {group.label ? (
                <h3 className="mb-2 text-sm font-semibold text-gray-500">{group.label}</h3>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.rows.map(({ guest, actionButton }) => (
                  <article key={guest.guest.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-baseline justify-between gap-2">
                        <p className="truncate font-semibold">{guest.guest.name}</p>
                        {guest.showStatus ? (
                          <span className="shrink-0 text-xs text-gray-500">({guest.statusLabel})</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{guest.roomName}</p>
                      <p className="mt-1 text-xs text-gray-500">{guest.taxiNumber}</p>
                    </div>
                    {actionButton ? (
                      <button
                        type="button"
                        onClick={actionButton.action}
                        disabled={guest.isPending}
                        className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionButton.caption}
                      </button>
                    ) : guest.fallbackCaption ? (
                      <span className="shrink-0 text-sm font-medium text-green-700">{guest.fallbackCaption}</span>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
