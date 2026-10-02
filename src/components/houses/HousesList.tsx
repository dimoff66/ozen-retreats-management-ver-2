'use client';

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import ActionBar from "@/components/common/ActionBar";
import HouseForm from "@/components/houses/HouseForm";
import HouseMapEditor from "@/components/houseMaps/HouseMapEditor";
import type { CreateHouse, House, HouseMap } from "@/services/database";
import housesService from "@/services/housesService";
import houseMapsService from "@/services/houseMapsService";

export default function HousesList() {
  const strTitle = "Houses";
  const strColumnName = "Name";
  const strColumnParent = "Parent house";
  const strColumnMap = "Map";
  const strNoParent = "-";
  const strCreateMap = "Create map";
  const strEditMap = "Edit map";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load houses.";
  const strDeleteConfirm = "Delete selected house?";

  const [houses, setHouses] = useState<House[]>([]);
  const [houseMaps, setHouseMaps] = useState<HouseMap[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [mapHouse, setMapHouse] = useState<House | null>(null);
  const [editingMap, setEditingMap] = useState<HouseMap | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const [housesData, mapsData] = await Promise.all([
        housesService.getHouses(),
        houseMapsService.getHouseMaps(),
      ]);

      setHouses(housesData);
      setHouseMaps(mapsData);
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onAddActionClick = () => {
    setEditingHouse(null);
    setIsFormOpen(true);
  };

  const onEditActionClick = (house: House) => {
    setEditingHouse(house);
    setIsFormOpen(true);
  };

  const onDeleteActionClick = async (house: House) => {
    const isConfirmed = window.confirm(strDeleteConfirm);

    if (!isConfirmed) {
      return;
    }

    await housesService.deleteHouse(house.id);
    setSelectedHouse(null);
    await loadData();
  };

  const onCancelActionClick = () => {
    setIsFormOpen(false);
    setEditingHouse(null);
  };

  const onSaveActionClick = async (data: CreateHouse) => {
    const isEditMode = editingHouse !== null;

    if (isEditMode) {
      await housesService.updateHouse(editingHouse.id, data);
    } else {
      await housesService.createHouse(data);
    }

    setIsFormOpen(false);
    setEditingHouse(null);
    setSelectedHouse(null);
    await loadData();
  };

  const onMapEditorCloseActionClick = () => {
    setIsMapEditorOpen(false);
    setMapHouse(null);
    setEditingMap(null);
  };

  const onMapSavedActionClick = async () => {
    setIsMapEditorOpen(false);
    setMapHouse(null);
    setEditingMap(null);
    await loadData();
  };

  const houseRows = houses.map((house) => {
    const parentHouse = houses.find((item) => item.id === house.parent_id);
    const houseMap = houseMaps.find((item) => item.house_id === house.id) ?? null;
    const parentName = parentHouse?.name ?? strNoParent;
    const mapButtonText = houseMap ? strEditMap : strCreateMap;
    const isSelected = selectedHouse?.id === house.id;

    const onRowClick = () => {
      setSelectedHouse(house);
    };

    const onMapClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setMapHouse(house);
      setEditingMap(houseMap);
      setIsMapEditorOpen(true);
    };

    return {
      id: house.id,
      name: house.name,
      parentName,
      mapButtonText,
      isSelected,
      onRowClick,
      onMapClick,
    };
  });

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1>
      <ActionBar
        selectedItem={selectedHouse}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
      />
      {isLoading ? <div>{strLoading}</div> : null}
      {isLoadError ? <div>{strLoadError}</div> : null}
      {!isLoading && !isLoadError ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">{strColumnName}</th>
                <th className="px-4 py-3 text-left">{strColumnParent}</th>
                <th className="px-4 py-3 text-left">{strColumnMap}</th>
              </tr>
            </thead>
            <tbody>
              {houseRows.map((house) => (
                <tr
                  key={house.id}
                  onClick={house.onRowClick}
                  className={house.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}
                >
                  <td className="px-4 py-3">{house.name}</td>
                  <td className="px-4 py-3">{house.parentName}</td>
                  <td className="px-4 py-3">
                    <button onClick={house.onMapClick} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-100">{house.mapButtonText}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {isFormOpen ? (
        <HouseForm
          house={editingHouse}
          houses={houses}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      ) : null}
      {isMapEditorOpen && mapHouse ? (
        <HouseMapEditor
          house={mapHouse}
          houseMap={editingMap}
          houses={houses}
          onSaveActionClick={onMapSavedActionClick}
          onCancelActionClick={onMapEditorCloseActionClick}
        />
      ) : null}
    </div>
  );
}