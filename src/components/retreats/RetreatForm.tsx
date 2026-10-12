'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { CreateRetreat, Retreat } from "@/services/database";

type RetreatFormProps = {
  retreat: Retreat | null;
  onSaveActionClick: (data: CreateRetreat) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function RetreatForm(props: RetreatFormProps) {
  const strAddTitle = "Add retreat";
  const strEditTitle = "Edit retreat";
  const strTitle = "Title";
  const strStartDate = "Start date";
  const strEndDate = "End date";
  const strActive = "Active";
  const strSave = "Save";
  const strCancel = "Cancel";

  const isEditMode = props.retreat !== null;
  const formTitle = isEditMode ? strEditTitle : strAddTitle;

  const [title, setTitle] = useState(props.retreat?.title ?? "");
  const [startDate, setStartDate] = useState(props.retreat?.start_date ?? "");
  const [endDate, setEndDate] = useState(props.retreat?.end_date ?? "");
  const [isActive, setIsActive] = useState(props.retreat?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const onTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const onStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const onEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const onActiveChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsActive(event.target.checked);
  };

  const onSubmitHandler = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data: CreateRetreat = {
      title,
      start_date: startDate,
      end_date: endDate,
      is_active: isActive,
    };

    setIsSaving(true);

    try {
      await props.onSaveActionClick(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="project-modal-backdrop">
      <div className="project-form-modal">
        <div className="project-form-modal-header"><h2>{formTitle}</h2></div>
        <form onSubmit={onSubmitHandler} className="project-form-body">
          <label className="project-form-field"><span>{strTitle}</span><input value={title} onChange={onTitleChange} required /></label>
          <div className="project-form-grid-two">
            <label className="project-form-field"><span>{strStartDate}</span><input type="date" value={startDate} onChange={onStartDateChange} required /></label>
            <label className="project-form-field"><span>{strEndDate}</span><input type="date" value={endDate} onChange={onEndDateChange} required /></label>
          </div>
          <label className="project-checkbox-field"><input type="checkbox" checked={isActive} onChange={onActiveChange} /><span>{strActive}</span></label>
          <div className="project-form-footer"><button type="button" onClick={props.onCancelActionClick} className="project-action-button project-action-button-secondary">{strCancel}</button><button type="submit" disabled={isSaving} className="project-action-button project-action-button-primary">{strSave}</button></div>
        </form>
      </div>
    </div>
  );
}
