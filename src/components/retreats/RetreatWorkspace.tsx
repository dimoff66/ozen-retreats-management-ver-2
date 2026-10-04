'use client';

import { useEffect, useState } from "react";
import type { HouseMapOpenMode } from "@/components/houseMaps/HouseMapView";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import HistoryPanel from "@/components/history/HistoryPanel";
import TaxiRidesPanel from "@/components/taxis/TaxiRidesPanel";
import GuestsList from "@/components/guests/GuestsList";
import RetreatRoomsForm from "@/components/retreats/RetreatRoomsForm";
import type { Retreat } from "@/services/database";
import retreatsService from "@/services/retreatsService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

type RetreatTab = {
  label: string;
  mapMode?: HouseMapOpenMode;
};

const tabsByRole: Record<string, RetreatTab[]> = {
  admin: [
    { label: "Guests" },
    { label: "Rooms" },
    { label: "Taxis" },
    { label: "Map" },
    { label: "History" },
  ],
  manager: [
    { label: "Guests" },
    { label: "View", mapMode: "normal" },
    { label: "Taxis" },
    { label: "History" },
  ],
  organizer: [
    { label: "Guests" },
    { label: "View", mapMode: "normal" },
    { label: "Taxis" },
    { label: "History" },
  ],
  taxi: [{ label: "Taxis" }],
};
const noTabs: RetreatTab[] = [];

export default function RetreatWorkspace() {
  const strLoading = "Loading retreats...";
  const strLoadError = "Failed to load retreats.";
  const strNoRetreats = "No retreat available for this user.";
  const strChooseRetreat = "Choose a retreat";
  const strChooseAnotherRetreat = "Choose another retreat";
  const strInactive = "Inactive";
  const strAdmin = "admin";
  const strOrganizer = "organizer";
  const strTaxi = "taxi";
  const { currentUser: user } = useCurrentUser();
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const tabs = user ? tabsByRole[user.role] ?? noTabs : noTabs;
  const selectedRetreat = retreats.find((retreat) => retreat.id === selectedRetreatId) ?? null;
  const canChangeRetreat = user?.role !== strOrganizer;
  const canManageTaxiRides = user?.role === strAdmin || user?.role === strTaxi;
  const isAdmin = user?.role === strAdmin;

  const onRoomsCloseActionClick = () => {
    setSelectedTab("Guests");
  };

  const onRetreatSelect = (retreat: Retreat) => {
    setSelectedRetreatId(retreat.id);
    setSelectedTab(tabs[0]?.label ?? "");
  };

  const onChangeRetreatClick = () => {
    setSelectedRetreatId(null);
    setSelectedTab("");
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;
    const retreatDataPromise: Promise<Retreat[]> = user.role === "organizer"
      ? user.retreat_id
        ? retreatsService.getRetreatById(user.retreat_id).then((retreat) => retreat ? [retreat] : [])
        : Promise.resolve([])
      : user.role === "admin"
        ? retreatsService.getRetreats()
        : retreatsService.getActiveRetreats();

    void retreatDataPromise
      .then((availableRetreats) => {
        if (isCancelled) {
          return;
        }

        const sortedRetreats = [...availableRetreats].sort((left, right) => {
          if (left.is_active !== right.is_active) {
            return left.is_active ? -1 : 1;
          }

          return left.start_date.localeCompare(right.start_date);
        });

        setIsLoadError(false);
        setRetreats(sortedRetreats);
        setSelectedRetreatId((current) => (
          sortedRetreats.some((retreat) => retreat.id === current)
            ? current
            : sortedRetreats[0]?.id ?? null
        ));
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoadError(true);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  if (!user || isLoading) {
    return <div>{strLoading}</div>;
  }

  if (isLoadError) {
    return <div role="alert" className="text-red-600">{strLoadError}</div>;
  }

  if (retreats.length === 0) {
    return <div>{strNoRetreats}</div>;
  }

  const activeTabName = selectedTab || (selectedRetreat ? tabs[0]?.label ?? "" : "");
  const activeTab = tabs.find((tab) => tab.label === activeTabName);
  const tabRows = tabs.map((tab) => {
    const onClickHandler = () => {
      setSelectedTab(tab.label);
    };

    return {
      ...tab,
      isSelected: activeTabName === tab.label,
      onClickHandler,
    };
  });
  const retreatCards = retreats.map((retreat) => {
    const onClickHandler = () => {
      onRetreatSelect(retreat);
    };

    return {
      id: retreat.id,
      title: retreat.title,
      dateRange: `${retreat.start_date} – ${retreat.end_date}`,
      isInactive: !retreat.is_active,
      onClickHandler,
    };
  });
  const showGuests = activeTabName === "Guests";
  const showRooms = activeTabName === "Rooms" && isAdmin;
  const showTaxis = activeTabName === "Taxis";
  const showMap = activeTab?.mapMode !== undefined;
  const showAdminMap = activeTabName === "Map" && isAdmin;
  const showHistory = activeTabName === "History";

  return (
    <div className="space-y-5">
      {selectedRetreat ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{selectedRetreat.title}</h1>
              <p className="text-sm text-gray-600">
                {selectedRetreat.start_date} – {selectedRetreat.end_date}
              </p>
            </div>
            {canChangeRetreat ? (
              <button
                type="button"
                onClick={onChangeRetreatClick}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                {strChooseAnotherRetreat}
              </button>
            ) : null}
          </div>
          <nav aria-label="Retreat sections" className="flex flex-wrap gap-2 border-b border-gray-200">
            {tabRows.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={tab.onClickHandler}
                aria-current={tab.isSelected ? "page" : undefined}
                className={tab.isSelected
                  ? "border-b-2 border-blue-600 px-4 py-2 font-semibold text-blue-700"
                  : "px-4 py-2 text-gray-600 hover:text-gray-900"}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div>
            {showGuests ? (
              <GuestsList retreatId={selectedRetreat.id} />
            ) : null}
            {showRooms ? (
              <RetreatRoomsForm
                retreat={selectedRetreat}
                onCloseActionClick={onRoomsCloseActionClick}
              />
            ) : null}
            {showTaxis ? (
              <TaxiRidesPanel
                retreatId={selectedRetreat.id}
                canManage={canManageTaxiRides}
              />
            ) : null}
            {showMap && activeTab?.mapMode ? (
              <HouseMapView retreatId={selectedRetreat.id} openMode={activeTab.mapMode} />
            ) : null}
            {showAdminMap ? (
              <HouseMapView retreatId={selectedRetreat.id} openMode="normal" />
            ) : null}
            {showHistory ? (
              <HistoryPanel retreatId={selectedRetreat.id} />
            ) : null}
          </div>
        </>
      ) : (
        <section>
          <h1 className="mb-5 text-2xl font-bold">{strChooseRetreat}</h1>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {retreatCards.map((retreat) => (
              <button
                key={retreat.id}
                type="button"
                onClick={retreat.onClickHandler}
                className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow"
              >
                <span className="block text-lg font-semibold">{retreat.title}</span>
                <span className="mt-1 block text-sm text-gray-600">{retreat.dateRange}</span>
                {retreat.isInactive ? (
                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {strInactive}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
