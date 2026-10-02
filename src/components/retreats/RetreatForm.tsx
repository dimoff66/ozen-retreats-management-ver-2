'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { CreateRetreat, Retreat } from "@/services/database";

type RetreatFormProps = {
  retreat: Retreat | null;
  onSaveActionClick: (data: CreateRetreat) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function RetreatForm({
  retreat,
  onSaveActionClick,
  onCancelActionClick,
}: RetreatFormProps) {
  const strAddTitle = "Add retreat";
  const strEditTitle = "Edit retreat";
  const strTitle = "Title";
  const strStartDate = "Start date";
  const strEndDate = "End date";
  const strActive = "Active";
  const strSave = "Save";
  const strCancel = "Cancel";

  const isEditMode = retreat !== null;
  const formTitle = isEditMode ? strEditTitle : strAddTitle;

  const [title, setTitle] = useState(retreat?.title ?? "");
  const [startDate, setStartDate] = useState(retreat?.start_date ?? "");
  const [endDate, setEndDate] = useState(retreat?.end_date ?? "");
  const [isActive, setIsActive] = useState(retreat?.is_active ?? true);
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
            <label className="mb-1 block text-sm font-medium">{strTitle}</label>
            <input value={title} onChange={onTitleChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strStartDate}</label>
            <input type="date" value={startDate} onChange={onStartDateChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{strEndDate}</label>
            <input type="date" value={endDate} onChange={onEndDateChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <label className="mb-6 flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={onActiveChange} />
            <span>{strActive}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelActionClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">{strCancel}</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{strSave}</button>
          </div>
        </form>
      </div>
    </div>
  );
}