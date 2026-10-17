'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  CreateGuest,
  CreateTaxiGuest,
  CreateTaxiRide,
  Guest,
  House,
  HouseMap,
  Retreat,
  RetreatRoom,
  Room,
  TaxiGuest,
  TaxiRide,
  UpdateGuest,
  UpdateTaxiRide,
} from "@/services/database";
import type { GuestStatusAction, GuestStatusValue } from "@/services/guestStatusesService";
import type { RetreatRoomSetting } from "@/services/retreatRoomsService";
import guestStatusesService from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import retreatRoomsService from "@/services/retreatRoomsService";
import retreatsService from "@/services/retreatsService";
import roomsService from "@/services/roomsService";
import retreatSnapshotService from "@/services/retreatSnapshotService";
import taxiRidesService from "@/services/taxiRidesService";
import type { RetreatSnapshot } from "@/services/retreatSnapshotService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

type RetreatContextValue = {
  retreats: Retreat[];
  retreat: Retreat | null;
  snapshot: RetreatSnapshot | null;
  getGuests: () => RetreatSnapshot["guests"];
  getGuestStatuses: () => RetreatSnapshot["statuses"];
  getLatestStatuses: () => RetreatSnapshot["latestStatuses"];
  getTaxiRides: () => RetreatSnapshot["taxiRides"];
  getTaxiGuests: () => RetreatSnapshot["taxiGuests"];
  getRetreatRooms: () => RetreatSnapshot["retreatRooms"];
  getHouses: () => RetreatSnapshot["houses"];
  getRooms: () => RetreatSnapshot["rooms"];
  findGuest: (guestId: number | null | undefined) => Guest | null;
  findHouse: (houseId: number | null | undefined) => House | null;
  findHouseMap: (houseMapId: number | null | undefined) => HouseMap | null;
  findRetreatRoom: (roomId: number | null | undefined) => RetreatRoom | null;
  findRoom: (roomId: number | null | undefined) => Room | null;
  findTaxiGuest: (guestId: number | null | undefined) => TaxiGuest | null;
  findTaxiRide: (rideId: number | null | undefined) => TaxiRide | null;
  getRoomDisplayNameById: (roomId: number | null | undefined) => string;
  getHouseMaps: () => RetreatSnapshot["houseMaps"];
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  changeRetreat: (retreatId: number) => void;
  createGuest: (guest: Omit<CreateGuest, "retreat_id">) => Promise<void>;
  updateGuest: (guestId: number, changes: UpdateGuest) => Promise<void>;
  swapRooms: (firstGuestId: number, secondGuestId: number) => Promise<void>;
  deleteGuest: (guestId: number) => Promise<void>;
  applyStatusAction: (
    guestId: number,
    currentStatus: GuestStatusValue,
    action: GuestStatusAction,
    roomId: number | null
  ) => Promise<void>;
  saveRooms: (settings: RetreatRoomSetting[]) => Promise<void>;
  createTaxiRide: (ride: Omit<CreateTaxiRide, "retreat_id">) => Promise<TaxiRide>;
  updateTaxiRide: (rideId: number, changes: UpdateTaxiRide) => Promise<TaxiRide>;
  deleteTaxiRide: (rideId: number) => Promise<void>;
  addTaxiGuest: (guest: CreateTaxiGuest) => Promise<void>;
  moveTaxiGuest: (taxiGuestId: number, rideId: number) => Promise<void>;
  deleteTaxiGuest: (taxiGuestId: number) => Promise<void>;
};

type RetreatProviderProps = {
  retreatId: number;
  retreats: Retreat[];
  onChangeRetreat: (retreatId: number) => void;
  children: ReactNode;
};

const RetreatContext = createContext<RetreatContextValue | null>(null);
const POLL_INTERVAL_MS = 5_000;
const FULL_REFRESH_INTERVAL_MS = 120_000;

export function RetreatProvider(props: RetreatProviderProps) {
  const { currentUser } = useCurrentUser();
  const [snapshot, setSnapshot] = useState<RetreatSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const isPollingRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const lastFullRefreshRef = useRef(0);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const loadSnapshot = useCallback(async (
    force = false,
    throwOnError = false,
    background = false
  ) => {
    if (background && document.visibilityState !== "visible") {
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      const retreat = await retreatsService.getRetreatById(props.retreatId);

      if (background && document.visibilityState !== "visible") {
        return;
      }

      if (!retreat) {
        throw new Error("Retreat no longer exists.");
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      const currentSnapshot = snapshotRef.current;
      if (
        !force
        && currentSnapshot?.retreat.id === props.retreatId
        && typeof retreat.version === "number"
        && typeof currentSnapshot.retreat.version === "number"
        && retreat.version === currentSnapshot.retreat.version
        && Date.now() - lastFullRefreshRef.current < FULL_REFRESH_INTERVAL_MS
      ) {
        setError("");
        setIsLoading(false);
        return;
      }

      const nextSnapshot = await retreatSnapshotService.getSnapshot(props.retreatId);

      if (background && document.visibilityState !== "visible") {
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      lastFullRefreshRef.current = Date.now();
      if (
        !currentSnapshot
        || currentSnapshot.retreat.id !== props.retreatId
        || JSON.stringify(currentSnapshot) !== JSON.stringify(nextSnapshot)
      ) {
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
        console.log("refreshed", new Date().toLocaleString());
      }

      setError("");
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load retreat data.";
        setError(message);

        if (throwOnError) {
          throw new Error(message);
        }
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [props.retreatId]);

  const refresh = useCallback(async () => {
    setIsLoading(snapshotRef.current === null);
    await loadSnapshot(true, true);
  }, [loadSnapshot]);

  const runMutation = useCallback(async <T,>(mutation: () => Promise<T>): Promise<T> => {
    const result = await mutation();
    await refresh();
    return result;
  }, [refresh]);

  const createGuest = useCallback(async (guest: Omit<CreateGuest, "retreat_id">) => {
    await runMutation(() => guestsService.createGuest(
      { ...guest, retreat_id: props.retreatId },
      currentUser.id
    ));
  }, [currentUser.id, props.retreatId, runMutation]);

  const updateGuest = useCallback(async (guestId: number, changes: UpdateGuest) => {
    await runMutation(() => guestsService.updateGuest(guestId, changes, currentUser.id));
  }, [currentUser.id, runMutation]);

  const swapRooms = useCallback(async (firstGuestId: number, secondGuestId: number) => {
    await runMutation(() => guestsService.swapRooms(firstGuestId, secondGuestId, currentUser.id));
  }, [currentUser.id, runMutation]);

  const deleteGuest = useCallback(async (guestId: number) => {
    await runMutation(() => guestsService.deleteGuest(guestId));
  }, [runMutation]);

  const applyStatusAction = useCallback(async (
    guestId: number,
    currentStatus: GuestStatusValue,
    action: GuestStatusAction,
    roomId: number | null
  ) => {
    await runMutation(() => guestStatusesService.applyStatusAction(
      props.retreatId,
      guestId,
      currentStatus,
      action,
      roomId,
      currentUser.id
    ));
  }, [currentUser.id, props.retreatId, runMutation]);

  // Ищут сущности текущего snapshot по их рабочим идентификаторам без дополнительных запросов.
  const findGuest = useCallback((guestId: number | null | undefined): Guest | null => {
    return snapshotRef.current?.guests.find(item => item.id === guestId) ?? null;
  }, []);

  const findHouse = useCallback((houseId: number | null | undefined): House | null => {
    return snapshotRef.current?.houses.find(item => item.id === houseId) ?? null;
  }, []);

  const findHouseMap = useCallback((houseMapId: number | null | undefined): HouseMap | null => {
    return snapshotRef.current?.houseMaps.find(item => item.id === houseMapId) ?? null;
  }, []);

  const findRetreatRoom = useCallback((roomId: number | null | undefined): RetreatRoom | null => {
    return snapshotRef.current?.retreatRooms.find(item => item.room_id === roomId) ?? null;
  }, []);

  const findRoom = useCallback((roomId: number | null | undefined): Room | null => {
    return snapshotRef.current?.rooms.find(item => item.id === roomId) ?? null;
  }, []);

  const findTaxiGuest = useCallback((guestId: number | null | undefined): TaxiGuest | null => {
    return snapshotRef.current?.taxiGuests.find(item => item.guest_id === guestId) ?? null;
  }, []);

  const findTaxiRide = useCallback((rideId: number | null | undefined): TaxiRide | null => {
    return snapshotRef.current?.taxiRides.find(item => item.id === rideId) ?? null;
  }, []);

  // Возвращает отображаемое имя комнаты из текущего snapshot без дополнительных запросов.
  const getRoomDisplayNameById = useCallback((roomId: number | null | undefined): string => {
    const room = findRoom(roomId);
    if (!room) {
      return "";
    }

    const house = findHouse(room.house_id);
    return house ? roomsService.getRoomDisplayName(room, house) : room.room_number;
  }, [findHouse, findRoom]);

  const saveRooms = useCallback(async (settings: RetreatRoomSetting[]) => {
    await runMutation(() => retreatRoomsService.saveRetreatRooms(props.retreatId, settings));
  }, [props.retreatId, runMutation]);

  const createTaxiRide = useCallback(async (
    ride: Omit<CreateTaxiRide, "retreat_id">
  ): Promise<TaxiRide> => {
    return runMutation(() => taxiRidesService.create({ ...ride, retreat_id: props.retreatId }));
  }, [props.retreatId, runMutation]);

  const updateTaxiRide = useCallback(async (
    rideId: number,
    changes: UpdateTaxiRide
  ): Promise<TaxiRide> => {
    return runMutation(() => taxiRidesService.update(rideId, changes));
  }, [runMutation]);

  const deleteTaxiRide = useCallback(async (rideId: number) => {
    await runMutation(() => taxiRidesService.delete(rideId));
  }, [runMutation]);

  const addTaxiGuest = useCallback(async (guest: CreateTaxiGuest) => {
    await runMutation(() => taxiRidesService.addGuest(guest));
  }, [runMutation]);

  const moveTaxiGuest = useCallback(async (taxiGuestId: number, rideId: number) => {
    await runMutation(() => taxiRidesService.moveGuest(taxiGuestId, rideId));
  }, [runMutation]);

  const deleteTaxiGuest = useCallback(async (taxiGuestId: number) => {
    await runMutation(() => taxiRidesService.deleteGuest(taxiGuestId));
  }, [runMutation]);

  const changeRetreat = useCallback((nextRetreatId: number) => {
    if (nextRetreatId === props.retreatId) {
      return;
    }

    if (!props.retreats.some(item => item.id === nextRetreatId)) {
      setError("The selected retreat is not available.");
      return;
    }

    props.onChangeRetreat(nextRetreatId);
  }, [props.onChangeRetreat, props.retreatId, props.retreats]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      void loadSnapshot(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [loadSnapshot, currentUser?.id]);

  useEffect(() => {
    const pollIfVisible = () => {
      if (document.visibilityState !== "visible" || isPollingRef.current) {
        return;
      }

      isPollingRef.current = true;
      void loadSnapshot(false, false, true).finally(() => {
        isPollingRef.current = false;
      });
    };

    const intervalId = window.setInterval(() => {
      pollIfVisible();
    }, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", pollIfVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", pollIfVisible);
    };
  }, [loadSnapshot]);

  const value = useMemo<RetreatContextValue>(() => ({
    retreats: props.retreats,
    retreat: snapshot?.retreat ?? null,
    snapshot,
    getGuests: () => snapshot?.guests ?? [],
    getGuestStatuses: () => snapshot?.statuses ?? [],
    getLatestStatuses: () => snapshot?.latestStatuses ?? new Map(),
    getTaxiRides: () => snapshot?.taxiRides ?? [],
    getTaxiGuests: () => snapshot?.taxiGuests ?? [],
    getRetreatRooms: () => snapshot?.retreatRooms ?? [],
    getHouses: () => snapshot?.houses ?? [],
    getRooms: () => snapshot?.rooms ?? [],
    findGuest,
    findHouse,
    findHouseMap,
    findRetreatRoom,
    findRoom,
    findTaxiGuest,
    findTaxiRide,
    getRoomDisplayNameById,
    getHouseMaps: () => snapshot?.houseMaps ?? [],
    isLoading,
    error,
    refresh,
    changeRetreat,
    createGuest,
    updateGuest,
    swapRooms,
    deleteGuest,
    applyStatusAction,
    saveRooms,
    createTaxiRide,
    updateTaxiRide,
    deleteTaxiRide,
    addTaxiGuest,
    moveTaxiGuest,
    deleteTaxiGuest,
  }), [
    props.retreats,
    snapshot,
    isLoading,
    error,
    refresh,
    changeRetreat,
    createGuest,
    updateGuest,
    swapRooms,
    deleteGuest,
    applyStatusAction,
    findGuest,
    findHouse,
    findHouseMap,
    findRetreatRoom,
    findRoom,
    findTaxiGuest,
    findTaxiRide,
    getRoomDisplayNameById,
    saveRooms,
    createTaxiRide,
    updateTaxiRide,
    deleteTaxiRide,
    addTaxiGuest,
    moveTaxiGuest,
    deleteTaxiGuest,
  ]);

  return (
    <RetreatContext.Provider value={value}>
      {props.children}
    </RetreatContext.Provider>
  );
}

export function useRetreat(): RetreatContextValue {
  const context = useContext(RetreatContext);

  if (!context) {
    throw new Error("useRetreat must be used inside RetreatProvider.");
  }

  return context;
}
