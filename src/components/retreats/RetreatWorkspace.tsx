'use client';

import { useEffect, useState } from "react";
import type { HouseMapOpenMode } from "@/components/houseMaps/HouseMapView";
import HouseMapView from "@/components/houseMaps/HouseMapView";
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
  ],
  manager: [
    { label: "Guests" },
    { label: "View", mapMode: "normal" },
    { label: "Taxis" },
  ],
  organizer: [
    { label: "Guests" },
    { label: "View", mapMode: "normal" },
    { label: "Taxis" },
  ],
  taxi: [{ label: "Taxis" }],
};
const noTabs: RetreatTab[] = [];

export default function RetreatWorkspace() {
  const { currentUser: user } = useCurrentUser();
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const tabs = user ? tabsByRole[user.role] ?? noTabs : noTabs;
  const selectedRetreat = retreats.find((retreat) => retreat.id === selectedRetreatId) ?? null;

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
    return <div>Loading retreats...</div>;
  }

  if (isLoadError) {
    return <div role="alert" className="text-red-600">Failed to load retreats.</div>;
  }

  if (retreats.length === 0) {
    return <div>No retreat available for this user.</div>;
  }

  const activeTabName = selectedTab || (selectedRetreat ? tabs[0]?.label ?? "" : "");
  const activeTab = tabs.find((tab) => tab.label === activeTabName);

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
            {user.role !== "organizer" ? (
              <button
                type="button"
                onClick={onChangeRetreatClick}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Choose another retreat
              </button>
            ) : null}
          </div>
          <nav aria-label="Retreat sections" className="flex flex-wrap gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setSelectedTab(tab.label)}
                aria-current={activeTabName === tab.label ? "page" : undefined}
                className={activeTabName === tab.label
                  ? "border-b-2 border-blue-600 px-4 py-2 font-semibold text-blue-700"
                  : "px-4 py-2 text-gray-600 hover:text-gray-900"}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div>
            {activeTabName === "Guests" ? (
              <GuestsList retreatId={selectedRetreat.id} />
            ) : null}
            {activeTabName === "Rooms" && user.role === "admin" ? (
              <RetreatRoomsForm
                retreat={selectedRetreat}
                onCloseActionClick={() => setSelectedTab("Guests")}
                onSavedActionClick={() => undefined}
              />
            ) : null}
            {activeTabName === "Taxis" ? (
              <TaxiRidesPanel
                retreatId={selectedRetreat.id}
                canManage={user.role === "admin" || user.role === "taxi"}
              />
            ) : null}
            {activeTab?.mapMode ? (
              <HouseMapView retreatId={selectedRetreat.id} openMode={activeTab.mapMode} />
            ) : null}
            {activeTabName === "Map" && user.role === "admin" ? (
              <HouseMapView retreatId={selectedRetreat.id} openMode="normal" />
            ) : null}
          </div>
        </>
      ) : (
        <section>
          <h1 className="mb-5 text-2xl font-bold">Choose a retreat</h1>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {retreats.map((retreat) => (
              <button
                key={retreat.id}
                type="button"
                onClick={() => onRetreatSelect(retreat)}
                className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow"
              >
                <span className="block text-lg font-semibold">{retreat.title}</span>
                <span className="mt-1 block text-sm text-gray-600">
                  {retreat.start_date} – {retreat.end_date}
                </span>
                {!retreat.is_active ? (
                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    Inactive
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
