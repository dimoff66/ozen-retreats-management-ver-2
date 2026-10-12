'use client';

import { useEffect, useState } from "react";
import ActionBar from "@/components/common/ActionBar";
import RetreatForm from "@/components/retreats/RetreatForm";
import RetreatRoomsForm from "@/components/retreats/RetreatRoomsForm";
import { RetreatProvider } from "@/contexts/RetreatContext";
import type { CreateRetreat, Retreat } from "@/services/database";
import dateService from "@/services/dateService";
import retreatsService from "@/services/retreatsService";

export default function RetreatsList() {
  const strTitle = "Retreats";
  const strColumnTitle = "Title";
  const strColumnStartDate = "Start date";
  const strColumnEndDate = "End date";
  const strColumnActive = "Active";
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
      label: "Rooms",
      onClickHandler: onRoomsActionClick,
    },
  ];

  const retreatRows = retreats.map(retreat => {
    const isSelected = selectedRetreat?.id === retreat.id;

    const onRowClick = () => {
      setSelectedRetreat(retreat);
    };

    return {
      id: retreat.id,
      title: retreat.title,
      startDate: dateService.formatDate(retreat.start_date),
      endDate: dateService.formatDate(retreat.end_date),
      activeText: retreat.is_active ? strYes : strNo,
      isSelected,
      onRowClick,
    };
  });

  useEffect(() => {
    loadRetreats();
  }, []);

  return (
    <section className="project-admin-section">
      <div className="project-admin-section-heading"><h2>{strTitle}</h2></div>
      <ActionBar selectedItem={selectedRetreat} onAddActionClick={onAddActionClick} onEditActionClick={onEditActionClick} onDeleteActionClick={onDeleteActionClick} extraActions={extraActions} />
      {roomsRetreat && (
        <div className="project-admin-inline-editor">
          <RetreatProvider
            key={roomsRetreat.id}
            retreatId={roomsRetreat.id}
            retreats={retreats}
            onChangeRetreat={retreatId => {
              setRoomsRetreat(retreats.find(retreat => retreat.id === retreatId) ?? null);
            }}
          >
            <RetreatRoomsForm onCloseActionClick={onRoomsCloseActionClick} />
          </RetreatProvider>
        </div>
      )}
      {isLoading && <div className="project-state-message">{strLoading}</div>}
      {isLoadError && <div className="project-state-message project-state-error">{strLoadError}</div>}
      {!isLoading && !isLoadError && (
        <div className="project-table-panel">
          <table className="project-data-table">
            <thead><tr><th>{strColumnTitle}</th><th>{strColumnStartDate}</th><th>{strColumnEndDate}</th><th>{strColumnActive}</th></tr></thead>
            <tbody>
              {retreatRows.map(retreat => (
                <tr key={retreat.id} onClick={retreat.onRowClick} className={retreat.isSelected ? "project-data-row project-data-row-selected" : "project-data-row"}>
                  <td className="project-admin-primary-cell">{retreat.title}</td>
                  <td>{retreat.startDate}</td>
                  <td>{retreat.endDate}</td>
                  <td><span className={retreat.activeText === strYes ? "project-admin-badge project-admin-badge-positive" : "project-admin-badge"}>{retreat.activeText}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isFormOpen && <RetreatForm retreat={editingRetreat} onSaveActionClick={onSaveActionClick} onCancelActionClick={onCancelActionClick} />}
    </section>
  );
}
