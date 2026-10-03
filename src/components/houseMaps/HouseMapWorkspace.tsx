'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import HouseMapView from "@/components/houseMaps/HouseMapView";
import type { HouseMapOpenMode } from "@/components/houseMaps/HouseMapView";
import type { Retreat } from "@/services/database";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import retreatsService from "@/services/retreatsService";

type HouseMapWorkspaceProps = {
  openMode: HouseMapOpenMode;
};

export default function HouseMapWorkspace({
  openMode,
}: HouseMapWorkspaceProps) {
  const strRetreat = "Retreat";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load retreats.";
  const strNoRetreats = "No retreat available.";

  const { currentUser: user } = useCurrentUser();

  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedRetreatId, setSelectedRetreatId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadRetreats = async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setIsLoadError(false);

    try {
      if (user.role === "organizer") {
        if (!user.retreat_id) {
          setRetreats([]);
          setSelectedRetreatId(null);
          return;
        }

        const retreat = await retreatsService.getRetreatById(user.retreat_id);

        if (!retreat) {
          setRetreats([]);
          setSelectedRetreatId(null);
          return;
        }

        setRetreats([retreat]);
        setSelectedRetreatId(retreat.id);
        return;
      }

      const data = await retreatsService.getActiveRetreats();

      setRetreats(data);
      setSelectedRetreatId(data.length > 0 ? data[0].id : null);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRetreatChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedRetreatId(Number(event.target.value));
  };

  const retreatOptions = retreats.map((retreat) => {
    return {
      id: retreat.id,
      title: retreat.title,
    };
  });

  useEffect(() => {
    loadRetreats();
  }, [user?.id]);

  if (!user || isLoading) {
    return <div>{strLoading}</div>;
  }

  if (isLoadError) {
    return <div>{strLoadError}</div>;
  }

  if (!selectedRetreatId) {
    return <div>{strNoRetreats}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 max-w-md shrink-0">
        <label className="mb-1 block text-sm font-medium">{strRetreat}</label>
        <select
          value={selectedRetreatId}
          onChange={onRetreatChange}
          disabled={user.role === "organizer"}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100"
        >
          {retreatOptions.map((retreat) => (
            <option key={retreat.id} value={retreat.id}>{retreat.title}</option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1">
        <HouseMapView
          retreatId={selectedRetreatId}
          openMode={openMode}
        />
      </div>
    </div>
  );
}