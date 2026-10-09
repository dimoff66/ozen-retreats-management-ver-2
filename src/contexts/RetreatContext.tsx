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
  Retreat,
  TaxiRide,
  UpdateGuest,
  UpdateTaxiRide,
} from "@/services/database";
import type { GuestStatusValue } from "@/services/guestStatusesService";
import type { RetreatRoomSetting } from "@/services/retreatRoomsService";
import guestStatusesService from "@/services/guestStatusesService";
import guestsService from "@/services/guestsService";
import retreatRoomsService from "@/services/retreatRoomsService";
import retreatsService from "@/services/retreatsService";
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
  getHouseMaps: () => RetreatSnapshot["houseMaps"];
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  changeRetreat: (retreatId: number) => void;
  createGuest: (guest: Omit<CreateGuest, "retreat_id">) => Promise<void>;
  updateGuest: (guestId: number, changes: UpdateGuest) => Promise<void>;
  swapRooms: (firstGuestId: number, secondGuestId: number) => Promise<void>;
  deleteGuest: (guestId: number) => Promise<void>;
  createStatus: (
    guestId: number,
    status: GuestStatusValue,
    room: string | null,
    updatedBy: number
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

export function RetreatProvider({
  retreatId,
  retreats,
  onChangeRetreat,
  children,
}: RetreatProviderProps) {
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
      const retreat = await retreatsService.getRetreatById(retreatId);

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
        && currentSnapshot?.retreat.id === retreatId
        && typeof retreat.version === "number"
        && typeof currentSnapshot.retreat.version === "number"
        && retreat.version === currentSnapshot.retreat.version
        && Date.now() - lastFullRefreshRef.current < FULL_REFRESH_INTERVAL_MS
      ) {
        setError("");
        setIsLoading(false);
        return;
      }

      const nextSnapshot = await retreatSnapshotService.getSnapshot(retreatId);

      if (background && document.visibilityState !== "visible") {
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      lastFullRefreshRef.current = Date.now();
      if (
        !currentSnapshot
        || currentSnapshot.retreat.id !== retreatId
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
  }, [retreatId]);

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
    await runMutation(() => guestsService.createGuest({ ...guest, retreat_id: retreatId }));
  }, [retreatId, runMutation]);

  const updateGuest = useCallback(async (guestId: number, changes: UpdateGuest) => {
    await runMutation(() => guestsService.updateGuest(guestId, changes));
  }, [runMutation]);

  const swapRooms = useCallback(async (firstGuestId: number, secondGuestId: number) => {
    await runMutation(() => guestsService.swapRooms(firstGuestId, secondGuestId));
  }, [runMutation]);

  const deleteGuest = useCallback(async (guestId: number) => {
    await runMutation(() => guestsService.deleteGuest(guestId));
  }, [runMutation]);

  const createStatus = useCallback(async (
    guestId: number,
    status: GuestStatusValue,
    room: string | null,
    updatedBy: number
  ) => {
    await runMutation(() => guestStatusesService.createStatus(
      retreatId,
      guestId,
      status,
      room,
      updatedBy
    ));
  }, [retreatId, runMutation]);

  const saveRooms = useCallback(async (settings: RetreatRoomSetting[]) => {
    await runMutation(() => retreatRoomsService.saveRetreatRooms(retreatId, settings));
  }, [retreatId, runMutation]);

  const createTaxiRide = useCallback(async (
    ride: Omit<CreateTaxiRide, "retreat_id">
  ): Promise<TaxiRide> => {
    return runMutation(() => taxiRidesService.create({ ...ride, retreat_id: retreatId }));
  }, [retreatId, runMutation]);

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
    if (nextRetreatId === retreatId) {
      return;
    }

    if (!retreats.some((item) => item.id === nextRetreatId)) {
      setError("The selected retreat is not available.");
      return;
    }

    onChangeRetreat(nextRetreatId);
  }, [onChangeRetreat, retreatId, retreats]);

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
    retreats,
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
    getHouseMaps: () => snapshot?.houseMaps ?? [],
    isLoading,
    error,
    refresh,
    changeRetreat,
    createGuest,
    updateGuest,
    swapRooms,
    deleteGuest,
    createStatus,
    saveRooms,
    createTaxiRide,
    updateTaxiRide,
    deleteTaxiRide,
    addTaxiGuest,
    moveTaxiGuest,
    deleteTaxiGuest,
  }), [
    retreats,
    snapshot,
    isLoading,
    error,
    refresh,
    changeRetreat,
    createGuest,
    updateGuest,
    swapRooms,
    deleteGuest,
    createStatus,
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
      {children}
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
