'use client';

import { useEffect, useState } from "react";
import type { HouseMapOpenMode } from "@/components/houseMaps/HouseMapView";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import HistoryPanel from "@/components/history/HistoryPanel";
import ManagerArrivalPanel from "@/components/retreats/ManagerArrivalPanel";
import TaxiRidesPanel from "@/components/taxis/TaxiRidesPanel";
import GuestsList from "@/components/guests/GuestsList";
import RetreatRoomsForm from "@/components/retreats/RetreatRoomsForm";
import { RetreatProvider, useRetreat } from "@/contexts/RetreatContext";
import type { Retreat } from "@/services/database";
import dateService from "@/services/dateService";
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
    { label: "Map", mapMode: "normal" },
    { label: "Meeting" },
    { label: "Check in" },
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

function RetreatHeading({ fallbackRetreat }: { fallbackRetreat: Retreat }) {
  const { retreat } = useRetreat();
  const displayedRetreat = retreat ?? fallbackRetreat;
  const dateRange = `${dateService.formatDate(displayedRetreat.start_date)} – ${dateService.formatDate(displayedRetreat.end_date)}`;

  return (
    <div className="ozen-retreat-heading-copy">
      <div className="ozen-retreat-title-line">
        <h1>{displayedRetreat.title}</h1>
      </div>
      <p>{dateRange}</p>
    </div>
  );
}

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
  const strWorkspace = "Workspace";
  const { currentUser: user } = useCurrentUser();
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const tabs = user ? tabsByRole[user.role] ?? noTabs : noTabs;
  const selectedRetreat = retreats.find((retreat) => retreat.id === selectedRetreatId) ?? null;
  const canChangeRetreat = user?.role !== strOrganizer;
  const canManageTaxiRides = user?.role === strAdmin
    || user?.role === strTaxi;
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
      dateRange: `${dateService.formatDate(retreat.start_date)} – ${dateService.formatDate(retreat.end_date)}`,
      isInactive: !retreat.is_active,
      onClickHandler,
    };
  });
  const showGuests = activeTabName === "Guests";
  const showMeeting = activeTabName === "Meeting" && user.role === "manager";
  const showCheckIn = activeTabName === "Check in" && user.role === "manager";
  const showRooms = activeTabName === "Rooms" && isAdmin;
  const showTaxis = activeTabName === "Taxis";
  const showMap = activeTab?.mapMode !== undefined;
  const showAdminMap = activeTabName === "Map" && isAdmin;
  const showHistory = activeTabName === "History";
  return (
    <div className="ozen-retreat-workspace">
      {selectedRetreat ? (
        <RetreatProvider
          key={selectedRetreat.id}
          retreatId={selectedRetreat.id}
          retreats={retreats}
          onChangeRetreat={(retreatId) => {
            setSelectedRetreatId(retreatId);
            setSelectedTab(tabs[0]?.label ?? "");
          }}
        >
          <>
            <div className="ozen-retreat-heading">
              <RetreatHeading fallbackRetreat={selectedRetreat} />
              {canChangeRetreat ? (
                <button
                  type="button"
                  onClick={onChangeRetreatClick}
                  aria-label={strChooseAnotherRetreat}
                  title={strChooseAnotherRetreat}
                  className="ozen-retreat-more-button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <circle cx="5" cy="12" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="19" cy="12" r="1.8" />
                  </svg>
                </button>
              ) : null}
            </div>
            <nav aria-label="Retreat sections" className="ozen-tabs">
              {tabRows.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={tab.onClickHandler}
                  aria-current={tab.isSelected ? "page" : undefined}
                  className={tab.isSelected
                    ? "ozen-tab ozen-tab-active"
                    : "ozen-tab"}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="ozen-retreat-content">
              {showGuests ? <GuestsList showTitle={false} /> : null}
              {showMeeting ? <ManagerArrivalPanel mode="meeting" showTitle={false} /> : null}
              {showCheckIn ? <ManagerArrivalPanel mode="check-in" showTitle={false} /> : null}
              {showRooms ? <RetreatRoomsForm onCloseActionClick={onRoomsCloseActionClick} showTitle={false} /> : null}
              {showTaxis ? <TaxiRidesPanel canManage={canManageTaxiRides} showTitle={false} /> : null}
              {showMap && activeTab?.mapMode ? <HouseMapView openMode={activeTab.mapMode} showTitle={false} /> : null}
              {showAdminMap ? <HouseMapView openMode="normal" showTitle={false} /> : null}
              {showHistory ? <HistoryPanel showTitle={false} /> : null}
            </div>
          </>
        </RetreatProvider>
      ) : (
        <section className="ozen-retreat-picker">
          <div className="ozen-page-heading"><div><p className="ozen-eyebrow">{strWorkspace}</p><h1>{strChooseRetreat}</h1></div></div>
          <div className="ozen-retreat-card-grid">
            {retreatCards.map((retreat) => (
              <button
                key={retreat.id}
                type="button"
                onClick={retreat.onClickHandler}
                className="ozen-retreat-card"
              >
                <span className="ozen-retreat-card-title">{retreat.title}</span>
                <span className="ozen-retreat-card-date">{retreat.dateRange}</span>
                {retreat.isInactive ? (
                  <span className="ozen-retreat-inactive">{strInactive}</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
