'use client';

import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type {
  Guest,
  Room,
} from "@/services/database";
import guestStatusesService from "@/services/guestStatusesService";
import type {
  GuestStatusAction,
  GuestStatusValue,
  LatestGuestStatus,
} from "@/services/guestStatusesService";
import type { GuestAction } from "@/services/guestActionsService";
import type { RoomPosition } from "@/services/houseMapsService";
import guestsService from "@/services/guestsService";
import houseMapsService from "@/services/houseMapsService";
import retreatRoomsService from "@/services/retreatRoomsService";
import roomsService from "@/services/roomsService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useRetreat } from "@/contexts/RetreatContext";

export type HouseMapOpenMode =
  | "normal"
  | "selection";

type SelectionMode = null | "room" | "guest";

type ActionTargetType = "room" | "guest";

type MapAction = {
  id: string;
  label: string;
  onClickHandler: () => void;
};

type RoomSelectionTarget = {
  guestId: number | null;
  name: string;
  roomId: number | null;
};

type HouseMapViewProps = {
  openMode?: HouseMapOpenMode;
  guest?: Guest | null;
  initialSelectionMode?: Exclude<SelectionMode, null>;
  onRoomSelectActionClick?: (room: Room) => Promise<void>;
  onGuestSwapActionClick?: (guest: Guest) => Promise<void>;
  onCancelActionClick?: () => void;
  roomSelectionTarget?: RoomSelectionTarget | null;
  showRoomSelectionList?: boolean;
  showTitle?: boolean;
};

export default function HouseMapView(props: HouseMapViewProps) {
  const strTitle = "House map";
  const strSelectRoom = "Select a room for";
  const strSelectGuest = "Select a guest to swap with";
  const strChoose = "Choose";
  const strCancel = "Cancel";
  const strCancelSelection = "Cancel selection";
  const strSelecting = "Updating room assignment...";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load house maps.";
  const strActionError = "Failed to perform action.";
  const strNoMaps = "No house maps available.";
  const strNoRooms = "No rooms available.";
  const strNoGuests = "No guests assigned to rooms.";
  const strRooms = "Rooms";
  const strGuests = "Guests";
  const strColumnRoom = "Room";
  const strColumnName = "Guest";
  const strColumnStatus = "Status";
  const strNoBackground = "No map image.";
  const strOrganizer = "organizer";
  const strShowHistory = "Show history";
  const strCloseActions = "Close";
  const strBooked = "booked";
  const strNotComingStatus = "not_coming";
  const strConfirmNonBookedGuest = "This guest's status is {status}, not {bookedStatus}. Continue with the room swap?";

  const isSelectionMode = props.openMode === "selection";
  const hasExternalRoomSelection = (props.initialSelectionMode ?? "room") === "room" && (props.roomSelectionTarget ?? null) !== null;
  const initialSelectionMode: SelectionMode =
    isSelectionMode && (props.guest || hasExternalRoomSelection) ? (props.initialSelectionMode ?? "room") : null;

  const { currentUser: user } = useCurrentUser();
  const retreatContext = useRetreat();

  const houses = retreatContext.snapshot?.houses ?? [];
  const rooms = retreatContext.snapshot?.rooms ?? [];
  const houseMaps = retreatContext.snapshot?.houseMaps ?? [];
  const retreatRooms = retreatContext.snapshot?.retreatRooms ?? [];
  const guests = retreatContext.snapshot?.guests ?? [];
  const statuses = retreatContext.snapshot?.latestStatuses ?? new Map<number, LatestGuestStatus>();
  const isSnapshotLoading = retreatContext.isLoading || !retreatContext.snapshot;
  const isLoadError = Boolean(retreatContext.error);

  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(initialSelectionMode);
  const [actionGuest, setActionGuest] = useState<Guest | null>(
    initialSelectionMode ? (props.guest ?? null) : null
  );
  const [actions, setActions] = useState<MapAction[]>([]);
  const [actionsTitle, setActionsTitle] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSelectionPending, setIsSelectionPending] = useState(false);

  const activeMapId = retreatContext.findHouseMap(selectedMapId)
    ? selectedMapId
    : houseMaps[0]?.id;

  if (!user) {
    return null;
  }

  const clearActions = () => {
    setActions([]);
    setActionsTitle("");
  };

  const finishSelection = () => {
    clearActions();
    setActionGuest(null);
    setSelectionMode(null);
    setIsSelectionPending(false);
  };

  const startRoomSelection = (targetGuest: Guest) => {
    clearActions();
    setActionGuest(targetGuest);
    setSelectionMode("room");
  };

  const startGuestSelection = (targetGuest: Guest) => {
    clearActions();
    setActionGuest(targetGuest);
    setSelectionMode("guest");
  };

  const onShowHistoryActionClick = () => {
    return;
  };

  const onGuestStatusAction = async (
    targetGuest: Guest, action: GuestStatusAction
  ) => {
    clearActions();
    setActionError("");

    try {
      const currentStatus = statuses.get(targetGuest.id)?.status ?? strBooked;
      await retreatContext.applyStatusAction(
        targetGuest.id, currentStatus, action, targetGuest.room_id
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const getAvailableActions = (
    targetType: ActionTargetType,
    targetGuest: Guest | null
  ): MapAction[] => {

    const showRoomHistoryAction: MapAction = {
      id: "show_room_history",
      label: strShowHistory,
      onClickHandler: onShowHistoryActionClick,
    };

    if (targetType === "room" || !targetGuest) {
      return [showRoomHistoryAction];
    }

    const guestStatus = statuses.get(targetGuest.id);
    const status: GuestStatusValue = guestStatus?.status ?? strBooked;
    const guestActions = guestsService.getGuestMenuActions(
      targetGuest,
      user.role,
      status,
      (selectedGuest, action) => {
        onGuestMenuAction(selectedGuest, action);
      }
    );

    const availableActions: MapAction[] = [
      ...guestActions.map(_ => ({
        id: _.id,
        label: _.caption,
        onClickHandler: _.action,
      })), 
      
      showRoomHistoryAction];

    return availableActions;
  };

  const onGuestMenuAction = (targetGuest: Guest, action: GuestAction) => {
    if (action === "move_room") {
      startRoomSelection(targetGuest);
    } else if (action === "swap_room") {
      startGuestSelection(targetGuest);
    } else if (guestStatusesService.isStatusAction(action)) {
      void onGuestStatusAction(targetGuest, action);
    }
  };

  const selectionGuestId = actionGuest?.id || props.roomSelectionTarget?.guestId || null;
  const selectionRoomId = actionGuest?.room_id || props.roomSelectionTarget?.roomId;
  const selectionGuestName = actionGuest?.name || props.roomSelectionTarget?.name || "";
  const hasRoomSelectionTarget = Boolean(actionGuest || props.roomSelectionTarget);
  const selectableRooms = retreatRoomsService.getSelectableRooms(
    rooms,
    retreatRooms,
    guests,
    statuses,
    selectionGuestId
  );

  const selectableRoomIds = new Set(selectableRooms.map(_ => _.id));

  const canSelectRoom = (room: Room): boolean => {
    if (selectionMode !== "room" || !hasRoomSelectionTarget) {
      return false;
    }

    if (selectionRoomId === room.id) {
      return false;
    }

    return selectableRoomIds.has(room.id);
  };

  const canSelectGuest = (targetGuest: Guest): boolean => {
    if (selectionMode !== "guest" || !actionGuest) {
      return false;
    }

    const actionGuestStatus = statuses.get(actionGuest.id)?.status ?? strBooked;
    const targetGuestStatus = statuses.get(targetGuest.id)?.status ?? strBooked;

    return guestsService.canSwapGuests(
      actionGuest, targetGuest, actionGuestStatus, targetGuestStatus
    );
  };

  const onRoomSelected = async (room: Room) => {
    if (isSelectionPending || selectionMode !== "room" || !canSelectRoom(room)) {
      return;
    }

    setIsSelectionPending(true);
    setActionError("");

    try {
      if (isSelectionMode && props.onRoomSelectActionClick) {
        await props.onRoomSelectActionClick(room);
        return;
      }

      if (!actionGuest) {
        throw new Error(strActionError);
      }

      await retreatContext.updateGuest(actionGuest.id, { room_id: room.id });

      finishSelection();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
      setIsSelectionPending(false);
    }
  };

  const onGuestSelected = async (targetGuest: Guest) => {
    if (isSelectionPending || selectionMode !== "guest" || !actionGuest || !canSelectGuest(targetGuest)) {
      return;
    }

    const firstRoomId = actionGuest.room_id;
    const secondRoomId = targetGuest.room_id;

    if (!firstRoomId || !secondRoomId) {
      return;
    }

    const targetStatus = statuses.get(targetGuest.id)?.status || strBooked;
    if (
      targetStatus !== strBooked
      && !window.confirm(strConfirmNonBookedGuest
        .replace("{status}", guestStatusesService.getStatusLabel(targetStatus))
        .replace("{bookedStatus}", guestStatusesService.getStatusLabel("booked")))
    ) {
      return;
    }

    setIsSelectionPending(true);
    setActionError("");

    try {
      if (isSelectionMode && props.onGuestSwapActionClick) {
        await props.onGuestSwapActionClick(targetGuest);
        return;
      }

      await retreatContext.swapRooms(actionGuest.id, targetGuest.id);

      finishSelection();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
      setIsSelectionPending(false);
    }
  };

  const onCancelSelectionActionClick = () => {
    if (isSelectionPending) {
      return;
    }

    if (isSelectionMode && props.onCancelActionClick) {
      props.onCancelActionClick();
      return;
    }

    finishSelection();
  };

  const getGuestClassName = (status: GuestStatusValue): string => {
    return guestStatusesService.getStatusTextClassName(status);
  };

  const selectedMap = retreatContext.findHouseMap(activeMapId) ?? null;
  const selectedHouse = retreatContext.findHouse(selectedMap?.house_id) ?? null;

  const roomPositions = houseMapsService.getRoomPositions(selectedMap);

  const mapTabs = [...houseMaps]
    .sort((left, right) => left.house_id - right.house_id || left.id - right.id)
    .map(houseMap => {
      const house = retreatContext.findHouse(houseMap.house_id);
      const label = house?.name || '';
      const isSelected = houseMap.id === activeMapId;

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

  const mapRoomItems = roomPositions
    .map(position => {
      const room = retreatContext.findRoom(position.room_id);

      if (!room || !selectedHouse) {
        return null;
      }

      const retreatRoom = retreatContext.findRetreatRoom(room.id);

      const roomGuests = guests.filter(
        item => item.room_id === room.id
      );

      const activeGuests = roomGuests.filter(roomGuest => {
        const status = statuses.get(roomGuest.id);

        return status?.status !== strNotComingStatus;
      });

      const maxGuests = retreatRoom?.max_guests ?? 0;

      const occupancyText = retreatRoom
        ? `${activeGuests.length}/${maxGuests}`
        : "";

      const isFull =
        retreatRoom !== undefined &&
        activeGuests.length >= maxGuests;

      const isRoomSelectable = canSelectRoom(room);
      const canAddGuest = room.is_available && retreatRoom !== undefined && !isFull;
      const isRoomInteractive = selectionMode === "room"
        ? isRoomSelectable
        : selectionMode === null && canAddGuest;
      const statusBarClassName = canAddGuest
        ? "bg-blue-600"
        : isFull
          ? "bg-green-600"
          : "bg-gray-400";

      const style: CSSProperties = {
        left: `${position.x}%`,
        top: `${position.y}%`,
      };

      const onRoomClickHandler = () => {
        if (isSelectionPending) {
          return;
        }

        if (selectionMode === "guest") {
          return;
        }

        if (selectionMode === "room") {
          onRoomSelected(room);
          return;
        }

        const roomActions = getAvailableActions(
          "room", null
        );

        setActions(roomActions);
        setActionsTitle(retreatContext.getRoomDisplayNameById(room.id));
      };

      const roomClassName = [
        "aspect-square w-12 max-w-[12vw] rounded-xl border-[3px] p-1 shadow-lg",
        canAddGuest
          ? "border-blue-700 bg-blue-100 text-blue-950"
          : isFull
            ? "border-green-700 bg-green-100 text-green-950"
            : "border-gray-400 bg-gray-100 text-gray-500",
        isRoomInteractive ? "cursor-pointer" : "cursor-default",
      ].join(" ");

      const guestItems = roomGuests.map(roomGuest => {
        const guestStatus = statuses.get(roomGuest.id);
        const status = guestStatus?.status ?? strBooked;

        const name = roomGuest.is_organizer
          ? `${roomGuest.name} (${strOrganizer})`
          : roomGuest.name;

        const isGuestSelectable = canSelectGuest(roomGuest);

        const onGuestClickHandler = (
          event: MouseEvent<HTMLButtonElement>
        ) => {
          event.stopPropagation();

          if (isSelectionPending) {
            return;
          }

          if (selectionMode === "room") {
            return;
          }

          if (selectionMode === "guest") {
            onGuestSelected(roomGuest);
            return;
          }

          const guestActions = getAvailableActions(
            "guest",
            roomGuest
          );

          setActions(guestActions);
          setActionsTitle(roomGuest.name);
        };

        let className = `rounded-sm border border-gray-300 bg-white px-1 py-0.5 shadow-sm ${getGuestClassName(status)}`;

        if (selectionMode === "guest" && isGuestSelectable) {
          className +=
            " cursor-pointer font-semibold underline";
        } else if (selectionMode === "guest") {
          className +=
            " cursor-default opacity-40";
        } else if (selectionMode === null) {
          className +=
            " cursor-pointer hover:underline";
        } else {
          className +=
            " cursor-default";
        }

        return {
          id: roomGuest.id,
          name,
          shortName: roomGuest.name.trim().split(/\s+/)[0] ?? roomGuest.name,
          className,
          onClickHandler: onGuestClickHandler,
        };
      });

      return {
        id: room.id,
        label: room.room_number,
        occupancyText,
        style,
        roomClassName,
        canAddGuest,
        statusBarClassName,
        onRoomClickHandler,
        guestItems,
      };
    })
    .filter(item => item !== null);

  const roomSelectionItems = roomsService.sortRooms(rooms, houses).map(room => {
    const retreatRoom = retreatContext.findRetreatRoom(room.id);
    const roomGuests = guests.filter(item => item.room_id === room.id);
    const activeGuests = roomGuests.filter(
      roomGuest => statuses.get(roomGuest.id)?.status !== strNotComingStatus
    );
    const maxGuests = retreatRoom?.max_guests || 0;
    const isRoomAvailable = room.is_available && retreatRoom !== undefined;
    const isFull = isRoomAvailable && activeGuests.length >= maxGuests;
    const canAddGuest = isRoomAvailable && !isFull;
    const statusBarClassName = !isRoomAvailable
      ? "bg-gray-400"
      : isFull
        ? "bg-green-600"
        : "bg-blue-600";
    const roomName = retreatContext.getRoomDisplayNameById(room.id);

    const onRoomClickHandler = () => {
      if (isSelectionPending) {
        return;
      }

      if (selectionMode === "guest") {
        return;
      }

      if (selectionMode === "room") {
        void onRoomSelected(room);
        return;
      }

      const roomActions = getAvailableActions("room", null);
      setActions(roomActions);
      setActionsTitle(roomName);
    };

    const guestItems = roomGuests.map(roomGuest => {
      const status = statuses.get(roomGuest.id)?.status ?? strBooked;
      const isGuestSelectable = canSelectGuest(roomGuest);
      const guestName = roomGuest.is_organizer
        ? `${roomGuest.name} (${strOrganizer})`
        : roomGuest.name;

      const onGuestClickHandler = () => {
        if (isSelectionPending) {
          return;
        }

        if (selectionMode === "room") {
          return;
        }

        if (selectionMode === "guest") {
          void onGuestSelected(roomGuest);
          return;
        }

        const guestActions = getAvailableActions("guest", roomGuest);
        setActions(guestActions);
        setActionsTitle(roomGuest.name);
      };

      const className = selectionMode === "guest"
        ? isGuestSelectable
          ? `rounded-full border border-blue-300 bg-white px-2 py-1 text-xs font-semibold ${getGuestClassName(status)} hover:bg-blue-50`
          : `rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs ${getGuestClassName(status)} opacity-50`
        : `rounded-full border border-gray-200 bg-white px-2 py-1 text-xs ${getGuestClassName(status)} hover:bg-gray-50`;

      return {
        id: roomGuest.id,
        name: guestName,
        className,
        isDisabled: selectionMode === "room"
          || (selectionMode === "guest" && !isGuestSelectable),
        onClickHandler: onGuestClickHandler,
      };
    });

    return {
      id: room.id,
      name: roomName,
      roomNumber: room.room_number,
      houseId: room.house_id,
      isAvailableForRetreat: isRoomAvailable,
      occupancyText: retreatRoom ? `${activeGuests.length}/${maxGuests}` : "—",
      canAddGuest,
      statusBarClassName,
      isSelectable: canSelectRoom(room),
      onRoomClickHandler,
      guestItems,
    };
  });

  const roomSelectionGroups = [...houses]
    .sort((left, right) => left.id - right.id)
    .map(house => {
      const houseRooms = roomSelectionItems.filter(room => room.houseId === house.id);
      const roomGroups = houseRooms.reduce<Array<{ prefix: string; rooms: typeof houseRooms }>>((groups, room) => {
        const prefix = room.roomNumber.match(/^[A-Za-z]+/)?.[0] ?? "";
        const currentGroup = groups[groups.length - 1];

        if (!currentGroup || currentGroup.prefix !== prefix) {
          groups.push({ prefix, rooms: [room] });
          return groups;
        }

        currentGroup.rooms.push(room);
        return groups;
      }, []);

      return {
        id: house.id,
        name: house.name,
        rooms: houseRooms,
        roomGroups,
      };
    })
    .filter(house => house.rooms.some(room => room.isAvailableForRetreat));

  const guestSelectionRows = roomsService.sortRooms(rooms, houses).flatMap(room => {
    const roomName = retreatContext.getRoomDisplayNameById(room.id);
    const roomGuests = guests
      .filter(roomGuest => roomGuest.room_id === room.id)
      .sort((left, right) => left.name.localeCompare(right.name));

    return roomGuests.map(roomGuest => {
      const status = statuses.get(roomGuest.id)?.status ?? strBooked;
      const guestName = roomGuest.is_organizer
        ? `${roomGuest.name} (${strOrganizer})`
        : roomGuest.name;

      return {
        id: roomGuest.id,
        roomName,
        guestName,
        statusLabel: guestStatusesService.getStatusLabel(status),
        statusBadgeClassName: guestStatusesService.getStatusBadgeClassName(status),
        isSelectable: canSelectGuest(roomGuest),
        onChoose: () => {
          void onGuestSelected(roomGuest);
        },
      };
    });
  });

  const preparedActions = actions.map(action => {
    const onClickHandler = () => {
      action.onClickHandler();
    };

    return {
      id: action.id,
      label: action.label,
      onClickHandler,
    };
  });

  const isActionsOpen =
    selectionMode === null &&
    actions.length > 0;

  let selectionText = "";

  if (selectionMode === "room" && selectionGuestName) {
    selectionText = `${strSelectRoom} ${selectionGuestName}`;
  }

  if (selectionMode === "guest" && actionGuest) {
    selectionText = `${strSelectGuest}: ${actionGuest.name}`;
  }

  return (
    <div className="relative flex h-full flex-col" aria-busy={isSelectionPending}>
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          {(props.showTitle !== false) && <h2 className="text-xl font-bold">{strTitle}</h2>}
          {selectionText && <div className="mt-1 text-sm text-gray-600">{selectionText}</div>}
        </div>
        <div className="flex gap-2">
          {selectionMode && (
            <button type="button" onClick={onCancelSelectionActionClick} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {strCancelSelection}
            </button>
          )}
          {!selectionMode && props.onCancelActionClick && (
            <button type="button" onClick={props.onCancelActionClick} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {strCancel}
            </button>
          )}
        </div>
      </div>
      {actionError && <div className="mb-4 text-red-600">{actionError}</div>}
      {isSnapshotLoading && <div>{strLoading}</div>}
      {isLoadError && <div>{strLoadError}</div>}
      {!isSnapshotLoading && !isLoadError && (houseMaps.length > 0 || rooms.length > 0) && (
        <>
          {mapTabs.length > 0 ? (
            <>
              <div className="mb-4 flex shrink-0 flex-wrap gap-2">
                {mapTabs.map(tab => (
                  <button key={tab.id} type="button" onClick={tab.onClickHandler} className={tab.isSelected ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {selectedMap && (
                <div className="mb-6 min-h-[400px] max-h-[70vh] overflow-auto bg-gray-100 p-4">
                  <div className="relative mx-auto w-full max-w-5xl overflow-hidden border border-gray-300 bg-white shadow-sm">
                    {selectedMap.bg_image_url ? (
                      <img src={selectedMap.bg_image_url} alt={selectedHouse?.name ?? ""} className="pointer-events-none block h-auto w-full select-none" draggable={false} />
                    ) : (
                      <div className="flex min-h-[500px] items-center justify-center text-gray-500">{strNoBackground}</div>
                    )}
                    {mapRoomItems.map(room => (
                      <div
                        key={room.id}
                        style={room.style}
                        onClick={room.onRoomClickHandler}
                        className="absolute z-10 flex w-12 max-w-[12vw] -translate-x-1/2 -translate-y-1/2 flex-col items-stretch"
                      >
                        <div className={`${room.roomClassName} group/room relative flex flex-col items-center transition-transform duration-150 ${room.canAddGuest ? "hover:z-20 hover:scale-110" : ""}`}>
                          <span className="max-w-full truncate text-xs font-extrabold" title={room.label}>{room.label}</span>
                          {room.occupancyText ? (
                            <span className="flex flex-1 items-center text-[10px] font-medium text-gray-500">{room.occupancyText}</span>
                          ) : <span className="flex-1" />}
                          <span className={`h-1 w-full rounded-full ${room.statusBarClassName}`} />
                        </div>
                        <div className="mt-1 flex min-h-5 flex-wrap items-center justify-center gap-x-1 px-0.5 text-[10px]">
                          {room.guestItems.map((roomGuest, index) => (
                            <span key={roomGuest.id} className="group/guest relative flex items-center gap-x-0.5">
                              {index > 0 && <span aria-hidden="true" className="text-gray-500">+</span>}
                              <button
                                type="button"
                                onClick={roomGuest.onClickHandler}
                                className={roomGuest.className}
                              >
                                {roomGuest.shortName}
                              </button>
                              <span
                                role="tooltip"
                                className="invisible absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow group-hover/guest:visible"
                              >
                                {roomGuest.name}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <div className="mb-6 text-gray-500">{strNoMaps}</div>}
          {selectionMode === "guest" ? (
            <section className="min-h-0 flex-1 overflow-auto">
              <h3 className="mb-3 text-lg font-semibold">{strGuests}</h3>
              {guestSelectionRows.length === 0 ? <div className="text-gray-500">{strNoGuests}</div> : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">{strChoose}</th>
                        <th className="px-4 py-3 text-left">{strColumnRoom}</th>
                        <th className="px-4 py-3 text-left">{strColumnName}</th>
                        <th className="px-4 py-3 text-left">{strColumnStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestSelectionRows.map(row => (
                        <tr key={row.id} className="border-t border-gray-200">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={row.onChoose}
                              disabled={!row.isSelectable}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {strChoose}
                            </button>
                          </td>
                          <td className="px-4 py-3">{row.roomName}</td>
                          <td className="px-4 py-3">{row.guestName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.statusBadgeClassName}`}>
                              {row.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (props.showRoomSelectionList ?? true) && (
            <section className="min-h-0 flex-1 overflow-auto">
              <h3 className="mb-3 text-lg font-semibold">{strRooms}</h3>
              {roomSelectionGroups.length === 0 ? <div className="text-gray-500">{strNoRooms}</div> : (
                <div className="space-y-4">
                  {roomSelectionGroups.map(house => (
                    <section key={house.id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <h4 className="mb-3 font-semibold text-gray-800">{house.name}</h4>
                      <div className="space-y-2">
                        {house.roomGroups.map(roomGroup => (
                          <div key={`${house.id}-${roomGroup.prefix || "numeric"}`} className="flex flex-wrap gap-2">
                            {roomGroup.rooms.map(room => (
                              <div key={room.id} className={`flex h-24 w-48 shrink-0 flex-col overflow-hidden rounded-lg border p-2 ${room.canAddGuest ? "border-blue-300 bg-blue-50" : room.statusBarClassName === "bg-green-600" ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-100"}`}>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={room.onRoomClickHandler}
                                    disabled={selectionMode === "room" && !room.isSelectable}
                                    className="text-left text-sm font-semibold text-gray-900 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                                  >
                                    {room.name}
                                  </button>
                                  <span className="text-xs font-medium text-gray-600">{room.occupancyText}</span>
                                </div>
                                <div className="mt-1 h-1 w-full rounded-full bg-gray-200">
                                  <div className={`h-full w-full rounded-full ${room.statusBarClassName}`} />
                                </div>
                                {room.guestItems.length > 0 && (
                                  <div className="mt-1 flex min-h-0 flex-1 flex-wrap content-start gap-1 overflow-y-auto">
                                    {room.guestItems.map(roomGuest => (
                                      <button
                                        key={roomGuest.id}
                                        type="button"
                                        onClick={roomGuest.onClickHandler}
                                        disabled={roomGuest.isDisabled}
                                        className={roomGuest.className}
                                      >
                                        {roomGuest.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
      {isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">{actionsTitle}</h3>
            <div className="flex flex-col gap-2">
              {preparedActions.map(action => (
                <button key={action.id} type="button" onClick={action.onClickHandler} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-left font-medium hover:bg-gray-50">
                  {action.label}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-200 pt-4">
              <button type="button" onClick={clearActions} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
                {strCloseActions}
              </button>
            </div>
          </div>
        </div>
      )}
      {isSelectionPending && (
        <div className="absolute inset-0 z-[60] flex cursor-wait items-center justify-center bg-white/30" role="status">
          <span className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow">{strSelecting}</span>
        </div>
      )}
    </div>
  );
}