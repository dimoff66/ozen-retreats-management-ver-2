'use client';

import { useEffect, useState } from "react";
import ActionBar from "@/components/common/ActionBar";
import RetreatForm from "@/components/retreats/RetreatForm";
import RetreatRoomsForm from "@/components/retreats/RetreatRoomsForm";
import type { CreateRetreat, Retreat } from "@/services/database";
import retreatsService from "@/services/retreatsService";

export default function RetreatsList() {
  const strTitle = "Retreats";
  const strColumnTitle = "Title";
  const strColumnStartDate = "Start date";
  const strColumnEndDate = "End date";
  const strColumnActive = "Active";
  const strRoomsAction = "Rooms";
  const strYes = "Yes";
  const strNo = "No";
  const strDeleteConfirm = "Delete selected retreat?";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load retreats.";

  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedRetreat, setSelectedRetreat] = useState<Retreat | null>(null);
  const [editingRetreat, setEditingRetreat] = useState<Retreat | null>(null);
  const [roomsRetreat, setRoomsRetreat] = useState<Retreat | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadRetreats = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const data = await retreatsService.getRetreats();
      setRetreats(data);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onAddActionClick = () => {
    setRoomsRetreat(null);
    setEditingRetreat(null);
    setIsFormOpen(true);
  };

  const onEditActionClick = (retreat: Retreat) => {
    setRoomsRetreat(null);
    setEditingRetreat(retreat);
    setIsFormOpen(true);
  };

  const onDeleteActionClick = async (retreat: Retreat) => {
    const isConfirmed = window.confirm(strDeleteConfirm);

    if (!isConfirmed) {
      return;
    }

    await retreatsService.deleteRetreat(retreat.id);
    setSelectedRetreat(null);
    await loadRetreats();
  };

  const onRoomsActionClick = (retreat: Retreat) => {
    setIsFormOpen(false);
    setEditingRetreat(null);
    setRoomsRetreat(retreat);
  };

  const onRoomsCloseActionClick = () => {
    setRoomsRetreat(null);
  };

  const onCancelActionClick = () => {
    setIsFormOpen(false);
    setEditingRetreat(null);
  };

  const onSaveActionClick = async (data: CreateRetreat) => {
    const isEditMode = editingRetreat !== null;

    if (isEditMode) {
      await retreatsService.updateRetreat(editingRetreat.id, data);
    } else {
      await retreatsService.createRetreat(data);
    }

    setIsFormOpen(false);
    setEditingRetreat(null);
    setSelectedRetreat(null);
    await loadRetreats();
  };

  const extraActions = [
    {
      label: strRoomsAction,
      onClickHandler: onRoomsActionClick,
    },
  ];

  const retreatRows = retreats.map((retreat) => {
    const isSelected = selectedRetreat?.id === retreat.id;

    const onRowClick = () => {
      setSelectedRetreat(retreat);
    };

    return {
      id: retreat.id,
      title: retreat.title,
      startDate: retreat.start_date,
      endDate: retreat.end_date,
      activeText: retreat.is_active ? strYes : strNo,
      isSelected,
      onRowClick,
    };
  });

  useEffect(() => {
    loadRetreats();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1>
      <ActionBar
        selectedItem={selectedRetreat}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
        extraActions={extraActions}
      />
      {isLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isLoading && !isLoadError ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">{strColumnTitle}</th>
                <th className="px-4 py-3 text-left">{strColumnStartDate}</th>
                <th className="px-4 py-3 text-left">{strColumnEndDate}</th>
                <th className="px-4 py-3 text-left">{strColumnActive}</th>
              </tr>
            </thead>
            <tbody>
              {retreatRows.map((retreat) => (
                <tr key={retreat.id} onClick={retreat.onRowClick} className={retreat.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}>
                  <td className="px-4 py-3">{retreat.title}</td>
                  <td className="px-4 py-3">{retreat.startDate}</td>
                  <td className="px-4 py-3">{retreat.endDate}</td>
                  <td className="px-4 py-3">{retreat.activeText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {isFormOpen ? (
        <RetreatForm
          retreat={editingRetreat}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      ) : null}
      {roomsRetreat ? (
        <RetreatRoomsForm
          retreat={roomsRetreat}
          onCloseActionClick={onRoomsCloseActionClick}
        />
      ) : null}
    </div>
  );
}