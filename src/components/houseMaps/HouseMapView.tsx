'use client';

import { useEffect, useState } from "react";
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
import { getAvailableGuestActions } from "@/services/guestActionsService";
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
  const strNoBackground = "No map image.";
  const strOrganizer = "organizer";
  const strMove = "Move to another room";
  const strSwap = "Swap with...";
  const strNotComing = "Not coming";
  const strCheckIn = "Check in";
  const strRegister = "Register";
  const strShowHistory = "Show history";
  const strCloseActions = "Close";
  const strBooked = "booked";
  const strCheckedIn = "checked_in";
  const strRegistered = "registered";
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
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(initialSelectionMode);
  const [actionGuest, setActionGuest] = useState<Guest | null>(
    initialSelectionMode ? guest : null
  );
  const [actions, setActions] = useState<MapAction[]>([]);
  const [actionsTitle, setActionsTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [actionError, setActionError] = useState("");

  if (!user) {
    return null;
  }

  const loadData = async () => {
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

  const onRegisterActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strRegistered);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onCancelCheckInActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strBooked);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strActionError);
    }
  };

  const onCancelRegistrationActionClick = async (targetGuest: Guest) => {
    clearActions();
    setActionError("");

    try {
      await createStatus(targetGuest, strCheckedIn);
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
    const guestActions = getAvailableGuestActions(
      user.role,
      status,
      targetGuest.room_id !== null
    );

    if (guestActions.includes("move_room")) {
      availableActions.push({
        id: "move",
        label: strMove,
        onClickHandler: () => startRoomSelection(targetGuest),
      });
    }

    if (guestActions.includes("swap_room")) {
      availableActions.push({
        id: "swap",
        label: strSwap,
        onClickHandler: () => startGuestSelection(targetGuest),
      });
    }

    if (guestActions.includes("not_coming")) {
      availableActions.push({
        id: "not_coming",
        label: strNotComing,
        onClickHandler: () => void onNotComingActionClick(targetGuest),
      });
    }

    if (guestActions.includes("check_in")) {
      availableActions.push({
        id: "check_in",
        label: strCheckIn,
        onClickHandler: () => void onCheckInActionClick(targetGuest),
      });
    }

    if (guestActions.includes("register")) {
      availableActions.push({
        id: "register",
        label: strRegister,
        onClickHandler: () => void onRegisterActionClick(targetGuest),
      });
    }

    if (guestActions.includes("cancel_check_in")) {
      availableActions.push({
        id: "cancel_check_in",
        label: "Cancel check-in",
        onClickHandler: () => void onCancelCheckInActionClick(targetGuest),
      });
    }

    if (guestActions.includes("cancel_registration")) {
      availableActions.push({
        id: "cancel_registration",
        label: "Cancel registration",
        onClickHandler: () => void onCancelRegistrationActionClick(targetGuest),
      });
    }

    if (user.role === "admin") {
      availableActions.push({
        id: "show_guest_history",
        label: strShowHistory,
        onClickHandler: onShowHistoryActionClick,
      });
    }

    return availableActions;
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

  const getGuestClassName = (status: string): string => {
    if (status === strCheckedIn) {
      return "text-green-700";
    }

    if (status === strRegistered) {
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

      const label = houseMapsService.getRoomLabel(
        room,
        selectedHouse,
        houses
      );

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

      const isCurrentActionRoom = actionGuest?.room_id === room.id;
      const isRoomSelectable = canSelectRoom(room);

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

      let roomClassName =
        "absolute -translate-x-1/2 -translate-y-1/2 border px-3 py-2 shadow-md";

      if (selectionMode === "room") {
        if (isRoomSelectable) {
          roomClassName +=
            " cursor-pointer rounded-full border-2 border-blue-400 bg-blue-50 hover:bg-blue-100";
        } else if (isCurrentActionRoom) {
          roomClassName +=
            " cursor-default rounded-md border-blue-300 bg-blue-100";
        } else {
          roomClassName +=
            " cursor-default rounded-md border-gray-300 bg-gray-100 text-gray-400";
        }
      } else if (!room.is_available || !retreatRoom || isFull) {
        roomClassName +=
          " cursor-default rounded-md border-gray-400 bg-gray-300 text-gray-500";
      } else {
        roomClassName +=
          " cursor-pointer rounded-md border-gray-300 bg-white";
      }

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

        let className = getGuestClassName(status);

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
          className,
          onClickHandler: onGuestClickHandler,
        };
      });

      return {
        id: room.id,
        label,
        occupancyText,
        style,
        roomClassName,
        onRoomClickHandler,
        guestItems,
      };
    })
    .filter((item) => item !== null);

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

  useEffect(() => {
    loadData();
  }, [retreatId]);

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
      {!isLoading && !isLoadError && houseMaps.length === 0 ? <div>{strNoMaps}</div> : null}
      {!isLoading && !isLoadError && houseMaps.length > 0 ? (
        <>
          <div className="mb-4 flex shrink-0 flex-wrap gap-2">
            {mapTabs.map((tab) => (
              <button key={tab.id} type="button" onClick={tab.onClickHandler} className={tab.isSelected ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"}>
                {tab.label}
              </button>
            ))}
          </div>
          {selectedMap ? (
            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
              <div className="relative mx-auto w-full max-w-5xl overflow-hidden border border-gray-300 bg-white shadow-sm">
                {selectedMap.bg_image_url ? (
                  <img src={selectedMap.bg_image_url} alt={selectedHouse?.name ?? ""} className="pointer-events-none block h-auto w-full select-none" draggable={false} />
                ) : (
                  <div className="flex min-h-[500px] items-center justify-center text-gray-500">{strNoBackground}</div>
                )}
                {mapRoomItems.map((room) => (
                  <div key={room.id} style={room.style} onClick={room.onRoomClickHandler} className={room.roomClassName}>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold">{room.label}</span>
                      {room.occupancyText ? <span className="text-xs font-normal">{room.occupancyText}</span> : null}
                    </div>
                    <div className="mt-1 flex flex-col text-xs">
                      {room.guestItems.map((roomGuest) => (
                        <button key={roomGuest.id} type="button" onClick={roomGuest.onClickHandler} className={roomGuest.className}>
                          {roomGuest.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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