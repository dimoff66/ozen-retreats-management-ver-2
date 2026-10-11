import { useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import type { Guest } from "@/services/database";
import type { GuestMenuAction } from "@/services/guestsService";

export type GuestCardRow = {
  guest: Guest;
  roomName: string;
  taxiNumber: string;
  statusLabel: string;
  statusBadgeClassName: string;
  isPending: boolean;
  showStatus: boolean;
  fallbackCaption: string;
  menuActions: GuestMenuAction[];
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
  const strSearch = "Search guests";
  const strGuestActions = "Guest actions";
  const [searchText, setSearchText] = useState("");
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  const groups = new Map<
    string,
    { label: string; index: number; rows: { guest: T; actionButton: GuestCardActionButton | null }[] }
  >();

  guests.forEach((guest, index) => {
    const matchesSearch = normalizedSearchText.length > 0
      && guest.guest.name.toLocaleLowerCase().includes(normalizedSearchText);
    const grouping = matchesSearch
      ? null
      : getGuestCardGroup?.(guest, index, guests) ?? null;
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
    const actionButton = matchesSearch ? null : grouping?.actionButton ?? null;
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
  let previousMainLabel = "";
  const preparedGroups = sortedGroups.map((group) => {
    const separatorIndex = group.label.indexOf("|");
    const hasCompositeLabel = separatorIndex >= 0;
    const mainLabel = hasCompositeLabel ? group.label.slice(0, separatorIndex).trim() : "";
    const label = hasCompositeLabel ? group.label.slice(separatorIndex + 1).trim() : group.label;
    const showMainLabel = mainLabel.length > 0 && mainLabel !== previousMainLabel;

    previousMainLabel = mainLabel;

    const rows = group.rows.map(({ guest, actionButton }) => {
      const initials = guest.guest.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const menuActions = guest.menuActions.map((menuAction) => {
        const onClickHandler = (event: MouseEvent<HTMLButtonElement>) => {
          event.currentTarget.closest("details")?.removeAttribute("open");
          menuAction.action();
        };

        return {
          ...menuAction,
          onClickHandler,
        };
      });

      return {
        guest,
        actionButton,
        initials,
        menuActions,
      };
    });

    return {
      ...group,
      label,
      mainLabel,
      showMainLabel,
      rows,
    };
  });

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  return (
    <div className="ozen-guest-cards-screen">
      <div className="ozen-guest-cards-toolbar">
        <label className="ozen-search-field">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span className="sr-only">{strSearch}</span>
          <input type="search" value={searchText} onChange={onSearchChange} placeholder={strSearch} />
        </label>
      </div>
      {guests.length === 0 ? <p className="ozen-empty-message">{emptyMessage}</p> : (
        <div className="ozen-card-groups">
          {preparedGroups.map((group) => (
            <section key={`${group.index}:${group.mainLabel}:${group.label}`} className="ozen-card-group">
              {group.showMainLabel ? <h3 className="ozen-card-group-main-title">{group.mainLabel}</h3> : null}
              {group.label ? <h4 className="ozen-card-group-title">{group.label}</h4> : null}
              <div className="ozen-guest-card-grid">
                {group.rows.map(({ guest, actionButton, initials, menuActions }) => (
                  <article key={guest.guest.id} className="ozen-guest-card">
                    <span className="ozen-guest-avatar">{initials}</span>
                    <div className="ozen-guest-card-copy">
                      <div className="ozen-guest-card-title-row">
                        <strong>{guest.guest.name}</strong>
                        {guest.showStatus ? (
                          <span className={`ozen-card-status ${guest.statusBadgeClassName}`}><i />{guest.statusLabel}</span>
                        ) : null}
                      </div>
                      <div className="ozen-guest-card-lower-row">
                        <div className="ozen-guest-card-meta">
                          <span>
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7">
                              <path d="M4 12v7M20 12v7M4 16h16M6 12V8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5V12" />
                            </svg>
                            {guest.roomName}
                          </span>
                          {guest.taxiNumber ? (
                            <span>
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7">
                                <path d="M5 16h14l-1.2-5.2A2.4 2.4 0 0 0 15.5 9h-7a2.4 2.4 0 0 0-2.3 1.8L5 16Z" />
                                <path d="M4 16v3M20 16v3M7 19h10" />
                              </svg>
                              {guest.taxiNumber}
                            </span>
                          ) : null}
                        </div>
                        <div className="ozen-guest-card-actions">
                          {actionButton ? (
                            <button
                              type="button"
                              onClick={actionButton.action}
                              disabled={guest.isPending}
                              className="ozen-primary-action"
                            >
                              {actionButton.caption}
                            </button>
                          ) : guest.fallbackCaption ? (
                            <span className="ozen-fallback-caption">{guest.fallbackCaption}</span>
                          ) : null}
                          {menuActions.length > 0 ? (
                            <details className="ozen-card-menu">
                              <summary aria-label={strGuestActions} title={strGuestActions}>
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                                  <circle cx="12" cy="5" r="1.8" />
                                  <circle cx="12" cy="12" r="1.8" />
                                  <circle cx="12" cy="19" r="1.8" />
                                </svg>
                              </summary>
                              <div className="ozen-card-menu-popover">
                                {menuActions.map((menuAction) => (
                                  <button
                                    key={menuAction.id}
                                    type="button"
                                    disabled={guest.isPending}
                                    onClick={menuAction.onClickHandler}
                                  >
                                    {menuAction.caption}
                                  </button>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    </div>
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
