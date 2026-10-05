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
    <div className="ozen-modal-backdrop">
      <div className="ozen-form-modal">
        <div className="ozen-form-modal-header"><h2>{formTitle}</h2></div>
        <form onSubmit={onSubmitHandler} className="ozen-form-body">
          <label className="ozen-form-field"><span>{strName}</span><input value={name} onChange={onNameChange} required /></label>
          <label className="ozen-form-field"><span>{strParent}</span><select value={parentId} onChange={onParentChange}><option value="">{strNoParent}</option>{availableParents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="ozen-form-footer"><button type="button" onClick={onCancelActionClick} className="ozen-action-button ozen-action-button-secondary">{strCancel}</button><button type="submit" disabled={isSaving} className="ozen-action-button ozen-action-button-primary">{strSave}</button></div>
        </form>
      </div>
    </div>
  );
}
