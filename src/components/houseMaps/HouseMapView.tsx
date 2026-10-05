'use client';

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type {
  Guest,
  House,
  HouseMap,
  RetreatRoom,
  Room,
} from "@/services/database";
import type {
  GuestStatusValue,
  LatestGuestStatus,
} from "@/services/guestStatusesService";
import type { GuestAction } from "@/services/guestActionsService";
import type { RoomPosition } from "@/services/houseMapsService";
import guestStatusesService from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import houseMapsService from "@/services/houseMapsService";
import housesService from "@/services/housesService";
import retreatRoomsService from "@/services/retreatRoomsService";
import roomsService from "@/services/roomsService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

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

type HouseMapViewProps = {
  retreatId: number;
  openMode?: HouseMapOpenMode;
  guest?: Guest | null;
  initialSelectionMode?: Exclude<SelectionMode, null>;
  onRoomSelectActionClick?: (room: Room) => void;
  onGuestSwapActionClick?: (guest: Guest) => void;
  onCancelActionClick?: () => void;
};

export default function HouseMapView({
  retreatId,
  openMode = "normal",
  guest = null,
  initialSelectionMode: requestedSelectionMode = "room",
  onRoomSelectActionClick,
  onGuestSwapActionClick,
  onCancelActionClick,
}: HouseMapViewProps) {
  const strTitle = "House map";
  const strSelectRoom = "Select a room for";
  const strSelectGuest = "Select a guest to swap with";
  const strCancel = "Cancel";
  const strCancelSelection = "Cancel selection";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load house maps.";
  const strActionError = "Failed to perform action.";
  const strNoMaps = "No house maps available.";
  const strNoRooms = "No rooms available.";
  const strMapView = "Map";
  const strRoomListView = "Rooms without map";
  const strNoBackground = "No map image.";
  const strOrganizer = "organizer";
  const strShowHistory = "Show history";
  const strCloseActions = "Close";
  const strBooked = "booked";
  const strCheckedIn = "checked_in";
  const strArrived = "arrived";
  const strNotComingStatus = "not_coming";

  const initialSelectionMode: SelectionMode =
    openMode === "selection" && guest ? requestedSelectionMode : null;

  const { currentUser: user } = useCurrentUser();

  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houseMaps, setHouseMaps] = useState<HouseMap[]>([]);
  const [retreatRooms, setRetreatRooms] = useState<RetreatRoom[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [statuses, setStatuses] = useState<Map<number, LatestGuestStatus>>(new Map());
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(initialSelectionMode);
  const [actionGuest, setActionGuest] = useState<Guest | null>(
    initialSelectionMode ? guest : null
  );
  const [actions, setActions] = useState<MapAction[]>([]);
  const [actionsTitle, setActionsTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [
        housesData,
        roomsData,
        mapsData,
        retreatRoomsData,
        guestsData,
        statusesData,
      ] = await Promise.all([
        housesService.getHouses(),
        roomsService.getRooms(),
        houseMapsService.getHouseMaps(),
        retreatRoomsService.getRetreatRooms(retreatId),
        guestsService.getGuestsByRetreatId(retreatId),
        guestStatusesService.getLatestForRetreat(retreatId),
      ]);

      setHouses(housesData);
      setRooms(roomsData);
      setHouseMaps(mapsData);
      setRetreatRooms(retreatRoomsData);
      setGuests(guestsData);
      setStatuses(statusesData);

      if (mapsData.length > 0) {
        setSelectedMapId((current) => current ?? mapsData[0].id);
      };
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [retreatId, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  if (!user) {
    return null;
  }

  const getRoomName = (room: Room): string => {
    const house = houses.find((item) => item.id === room.house_id);

    if (!house) {
      return room.room_number;
    }

    return roomsService.getRoomDisplayName(room, house);
  };

  const getGuestRoomName = (targetGuest: Guest): string | null => {
    if (!targetGuest.room_id) {
      return null;
    }

    const room = rooms.find((item) => item.id === targetGuest.room_id);

    if (!room) {
      return null;
    }

    return getRoomName(room);
  };

  const updateLocalStatus = (
    targetGuest: Guest,
    status: GuestStatusValue,
    roomName: string | null,
    changedAt: string
  ) => {
    setStatuses((current) => {
      const next = new Map<number, LatestGuestStatus>(current);

      next.set(targetGuest.id, {
        guestId: targetGuest.id,
        status,
        room: roomName,
        changedAt,
      });

      return next;
    });
  };

  const createStatus = async (targetGuest: Guest, status: GuestStatusValue) => {
    const roomName = getGuestRoomName(targetGuest);

    const createdStatus = await guestStatusesService.createStatus(
      targetGuest.id,
      status,
      roomName,
      user.id
    );

    updateLocalStatus(
      targetGuest,
      status,
      roomName,
      createdStatus.changed_at
    );
  };

  const clearActions = () => {
    setActions([]);
    setActionsTitle("");
  };

  const finishSelection = () => {
    clearActions();
    setActionGuest(null);
    setSelectionMode(null);
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

  const onNotComingActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strNotComingStatus);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onCheckInActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strCheckedIn);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onMarkArrivedActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strArrived);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onCancelCheckInActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strArrived);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onCancelArrivalActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strBooked);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const getAvailableActions = (
    targetType: ActionTargetType,
    room: Room,
    targetGuest: Guest | null
  ): MapAction[] => {
    const availableActions: MapAction[] = [];

    if (targetType === "room") {
      if (user.role === "admin") {
        availableActions.push({
          id: "show_room_history",
          label: strShowHistory,
          onClickHandler: onShowHistoryActionClick,
        });
      }

      return availableActions;
    }

    if (!targetGuest) {
      return availableActions;
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

    availableActions.push(...guestActions.map((guestAction) => ({
      id: guestAction.id,
      label: guestAction.caption,
      onClickHandler: guestAction.action,
    })));

    if (user.role === "admin") {
      availableActions.push({
        id: "show_guest_history",
        label: strShowHistory,
        onClickHandler: onShowHistoryActionClick,
      });
    }

    return availableActions;
  };

  const onGuestMenuAction = (targetGuest: Guest, action: GuestAction) => {
    if (action === "move_room") {
      startRoomSelection(targetGuest);
    } else if (action === "swap_room") {
      startGuestSelection(targetGuest);
    } else if (action === "not_coming") {
      void onNotComingActionClick(targetGuest);
    } else if (action === "mark_arrived") {
      void onMarkArrivedActionClick(targetGuest);
    } else if (action === "check_in") {
      void onCheckInActionClick(targetGuest);
    } else if (action === "cancel_check_in") {
      void onCancelCheckInActionClick(targetGuest);
    } else if (action === "cancel_arrival") {
      void onCancelArrivalActionClick(targetGuest);
    }
  };

  const selectableRooms = retreatRoomsService.getSelectableRooms(
    rooms,
    retreatRooms,
    guests,
    statuses,
    actionGuest?.id ?? null
  );

  const selectableRoomIds = new Set(selectableRooms.map((room) => room.id));

  const canSelectRoom = (room: Room): boolean => {
    if (selectionMode !== "room" || !actionGuest) {
      return false;
    }

    if (actionGuest.room_id === room.id) {
      return false;
    }

    return selectableRoomIds.has(room.id);
  };

  const canSelectGuest = (targetGuest: Guest): boolean => {
    if (selectionMode !== "guest" || !actionGuest) {
      return false;
    }

    if (targetGuest.id === actionGuest.id) {
      return false;
    }

    if (!targetGuest.room_id || !actionGuest.room_id) {
      return false;
    }

    if (targetGuest.room_id === actionGuest.room_id) {
      return false;
    }

    const targetStatus = statuses.get(targetGuest.id);

    if (targetStatus?.status === strNotComingStatus) {
      return false;
    }

    return true;
  };

  const onRoomSelected = async (room: Room) => {
    if (selectionMode !== "room" || !actionGuest || !canSelectRoom(room)) {
      return;
    }

    setActionError("");

    try {
      if (openMode === "selection" && onRoomSelectActionClick) {
        onRoomSelectActionClick(room);
        return;
      }

      const updatedGuest = await guestsService.updateGuest(
        actionGuest.id,
        {
          room_id: room.id,
        }
      );

      setGuests((current) =>
        current.map((item) =>
          item.id === updatedGuest.id ? updatedGuest : item
        )
      );

      finishSelection();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onGuestSelected = async (targetGuest: Guest) => {
    if (selectionMode !== "guest" || !actionGuest || !canSelectGuest(targetGuest)) {
      return;
    }

    const firstRoomId = actionGuest.room_id;
    const secondRoomId = targetGuest.room_id;

    if (!firstRoomId || !secondRoomId) {
      return;
    }

    setActionError("");

    try {
      if (openMode === "selection" && onGuestSwapActionClick) {
        onGuestSwapActionClick(targetGuest);
        return;
      }

      const firstUpdatedGuest = await guestsService.updateGuest(
        actionGuest.id,
        {
          room_id: secondRoomId,
        }
      );

      const secondUpdatedGuest = await guestsService.updateGuest(
        targetGuest.id,
        {
          room_id: firstRoomId,
        }
      );

      setGuests((current) =>
        current.map((item) => {
          if (item.id === firstUpdatedGuest.id) {
            return firstUpdatedGuest;
          }

          if (item.id === secondUpdatedGuest.id) {
            return secondUpdatedGuest;
          }

          return item;
        })
      );

      finishSelection();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onCancelSelectionActionClick = () => {
    if (openMode === "selection" && onCancelActionClick) {
      onCancelActionClick();
      return;
    }

    finishSelection();
  };

  const onMapViewClick = () => {
    setIsMapVisible(true);
  };

  const onRoomListViewClick = () => {
    setIsMapVisible(false);
  };

  const getGuestClassName = (status: string): string => {
    if (status === strCheckedIn) {
      return "text-green-700";
    }

    if (status === strArrived) {
      return "text-blue-700";
    }

    if (status === strNotComingStatus) {
      return "text-black line-through";
    }

    return "text-gray-700";
  };

  const selectedMap =
    houseMaps.find((item) => item.id === selectedMapId) ?? null;

  const selectedHouse =
    houses.find((item) => item.id === selectedMap?.house_id) ?? null;

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

  const mapRoomItems = roomPositions
    .map((position: RoomPosition) => {
      const room = rooms.find((item) => item.id === position.room_id);

      if (!room || !selectedHouse) {
        return null;
      }

      const retreatRoom = retreatRooms.find(
        (item) => item.room_id === room.id
      );

      const roomGuests = guests.filter(
        (item) => item.room_id === room.id
      );

      const activeGuests = roomGuests.filter((roomGuest) => {
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
      const statusBarClassName = activeGuests.length > 0
        ? "bg-green-600"
        : canAddGuest
          ? "bg-blue-600"
          : "bg-gray-400";

      const style: CSSProperties = {
        left: `${position.x}%`,
        top: `${position.y}%`,
      };

      const onRoomClickHandler = () => {
        if (selectionMode === "guest") {
          return;
        }

        if (selectionMode === "room") {
          void onRoomSelected(room);
          return;
        }

        const roomActions = getAvailableActions(
          "room",
          room,
          null
        );

        setActions(roomActions);
        setActionsTitle(getRoomName(room));
      };

      const roomClassName = [
        "aspect-square w-12 max-w-[12vw] rounded-xl border-[3px] p-1 shadow-lg",
        activeGuests.length > 0
          ? "border-green-700 bg-green-100 text-green-950"
          : canAddGuest
            ? "border-blue-700 bg-blue-100 text-blue-950"
            : "border-gray-400 bg-gray-100 text-gray-500",
        isRoomInteractive ? "cursor-pointer" : "cursor-default",
      ].join(" ");

      const guestItems = roomGuests.map((roomGuest) => {
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

          if (selectionMode === "room") {
            return;
          }

          if (selectionMode === "guest") {
            void onGuestSelected(roomGuest);
            return;
          }

          const guestActions = getAvailableActions(
            "guest",
            room,
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
    .filter((item) => item !== null);

  const roomSelectionItems = roomsService.sortRooms(rooms, houses).map((room) => {
    const house = houses.find((item) => item.id === room.house_id);
    const retreatRoom = retreatRooms.find((item) => item.room_id === room.id);
    const roomGuests = guests.filter((item) => item.room_id === room.id);
    const activeGuests = roomGuests.filter(
      (roomGuest) => statuses.get(roomGuest.id)?.status !== strNotComingStatus
    );
    const maxGuests = retreatRoom?.max_guests ?? 0;
    const isRoomAvailable = room.is_available && retreatRoom !== undefined;
    const isFull = isRoomAvailable && activeGuests.length >= maxGuests;
    const canAddGuest = isRoomAvailable && !isFull;
    const statusBarClassName = !isRoomAvailable
      ? "bg-gray-400"
      : isFull
        ? "bg-green-600"
        : "bg-blue-600";
    const roomName = house ? roomsService.getRoomDisplayName(room, house) : room.room_number;

    const onRoomClickHandler = () => {
      if (selectionMode === "guest") {
        return;
      }

      if (selectionMode === "room") {
        void onRoomSelected(room);
        return;
      }

      const roomActions = getAvailableActions("room", room, null);
      setActions(roomActions);
      setActionsTitle(roomName);
    };

    const guestItems = roomGuests.map((roomGuest) => {
      const status = statuses.get(roomGuest.id)?.status ?? strBooked;
      const isGuestSelectable = canSelectGuest(roomGuest);
      const guestName = roomGuest.is_organizer
        ? `${roomGuest.name} (${strOrganizer})`
        : roomGuest.name;

      const onGuestClickHandler = () => {
        if (selectionMode === "room") {
          return;
        }

        if (selectionMode === "guest") {
          void onGuestSelected(roomGuest);
          return;
        }

        const guestActions = getAvailableActions("guest", room, roomGuest);
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
      occupancyText: retreatRoom ? `${activeGuests.length}/${maxGuests}` : "—",
      canAddGuest,
      statusBarClassName,
      isSelectable: canSelectRoom(room),
      onRoomClickHandler,
      guestItems,
    };
  });

  const preparedActions = actions.map((action) => {
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

  if (selectionMode === "room" && actionGuest) {
    selectionText = `${strSelectRoom} ${actionGuest.name}`;
  }

  if (selectionMode === "guest" && actionGuest) {
    selectionText = `${strSelectGuest}: ${actionGuest.name}`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{strTitle}</h2>
          {selectionText ? <div className="mt-1 text-sm text-gray-600">{selectionText}</div> : null}
        </div>
        <div className="flex gap-2">
          {selectionMode ? (
            <button type="button" onClick={onCancelSelectionActionClick} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {strCancelSelection}
            </button>
          ) : null}
          {!selectionMode && onCancelActionClick ? (
            <button type="button" onClick={onCancelActionClick} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {strCancel}
            </button>
          ) : null}
        </div>
      </div>
      {actionError ? <div className="mb-4 text-red-600">{actionError}</div> : null}
      {isLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isLoading && !isLoadError && (houseMaps.length > 0 || rooms.length > 0) ? (
        <>
          <div className="mb-4 flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onMapViewClick} aria-pressed={isMapVisible} className={isMapVisible ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"}>
              {strMapView}
            </button>
            <button type="button" onClick={onRoomListViewClick} aria-pressed={!isMapVisible} className={!isMapVisible ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"}>
              {strRoomListView}
            </button>
          </div>
          {!isMapVisible ? (
            <div className="min-h-0 flex-1 overflow-auto">
              {roomSelectionItems.length === 0 ? <div className="text-gray-500">{strNoRooms}</div> : (
                <div className="flex flex-wrap items-start gap-3">
                  {roomSelectionItems.map((room) => (
                    <div key={room.id} className={`min-w-52 max-w-full rounded-xl border p-3 shadow-sm ${room.canAddGuest ? "border-blue-300 bg-blue-50" : room.statusBarClassName === "bg-green-600" ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-100"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={room.onRoomClickHandler}
                          disabled={selectionMode === "room" && !room.isSelectable}
                          className="text-left font-semibold text-gray-900 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                        >
                          {room.name}
                        </button>
                        <span className="shrink-0 text-xs font-medium text-gray-600">{room.occupancyText}</span>
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-gray-200">
                        <div className={`h-full w-full rounded-full ${room.statusBarClassName}`} />
                      </div>
                      {room.guestItems.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {room.guestItems.map((roomGuest) => (
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
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {mapTabs.length > 0 ? (
                <div className="mb-4 flex shrink-0 flex-wrap gap-2">
                  {mapTabs.map((tab) => (
                    <button key={tab.id} type="button" onClick={tab.onClickHandler} className={tab.isSelected ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : <div className="text-gray-500">{strNoMaps}</div>}
              {selectedMap ? (
            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
              <div className="relative mx-auto w-full max-w-5xl overflow-hidden border border-gray-300 bg-white shadow-sm">
                {selectedMap.bg_image_url ? (
                  <img src={selectedMap.bg_image_url} alt={selectedHouse?.name ?? ""} className="pointer-events-none block h-auto w-full select-none" draggable={false} />
                ) : (
                  <div className="flex min-h-[500px] items-center justify-center text-gray-500">{strNoBackground}</div>
                )}
                {mapRoomItems.map((room) => (
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
                    <div
                      className="mt-1 flex min-h-5 flex-wrap items-center justify-center gap-x-1 px-0.5 text-[10px]"
                    >
                      {room.guestItems.map((roomGuest, index) => (
                        <span key={roomGuest.id} className="group/guest relative flex items-center gap-x-0.5">
                          {index > 0 ? <span aria-hidden="true" className="text-gray-500">+</span> : null}
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
              ) : null}
            </>
          )}
        </>
      ) : null}
      {isActionsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">{actionsTitle}</h3>
            <div className="flex flex-col gap-2">
              {preparedActions.map((action) => (
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
      ) : null}
    </div>
  );
}