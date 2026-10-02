'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { CreateHouse, House } from "@/services/database";

type HouseFormProps = {
  house: House | null;
  houses: House[];
  onSaveActionClick: (data: CreateHouse) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function HouseForm({
  house,
  houses,
  onSaveActionClick,
  onCancelActionClick,
}: HouseFormProps) {
  const strAddTitle = "Add house";
  const strEditTitle = "Edit house";
  const strName = "Name";
  const strParent = "Parent house";
  const strNoParent = "No parent";
  const strSave = "Save";
  const strCancel = "Cancel";

  const isEditMode = house !== null;
  const formTitle = isEditMode ? strEditTitle : strAddTitle;

  const [name, setName] = useState(house?.name ?? "");
  const [parentId, setParentId] = useState(house?.parent_id?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const availableParents = houses.filter((item) => {
    const isRootHouse = item.parent_id === null;
    const isCurrentHouse = item.id === house?.id;

    return isRootHouse && !isCurrentHouse;
  });

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onParentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setParentId(event.target.value);
  };

  const onSubmitHandler = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data: CreateHouse = {
      name,
      parent_id: parentId ? Number(parentId) : null,
    };

    setIsSaving(true);

    try {
      await onSaveActionClick(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-semibold">{formTitle}</h2>
        <form onSubmit={onSubmitHandler}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strName}</label>
            <input value={name} onChange={onNameChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium">{strParent}</label>
            <select value={parentId} onChange={onParentChange} className="w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="">{strNoParent}</option>
              {availableParents.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelActionClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">{strCancel}</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{strSave}</button>
          </div>
        </form>
      </div>
    </div>
  );
}