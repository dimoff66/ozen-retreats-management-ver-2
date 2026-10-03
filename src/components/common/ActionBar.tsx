'use client';

import React from 'react';

// Структура дополнительного действия
export interface ExtraAction<T> {
  label: string;
  onClickHandler: (item: T) => void;
}

interface ActionBarProps<T> {
  disabled?: boolean;
  selectedItem: T | null;
  onAddActionClick: () => void;
  onEditActionClick: (item: T) => void;
  onDeleteActionClick: (item: T) => void;
  extraActions?: ExtraAction<T>[];
}

export default function ActionBar<T>({
  disabled = false,
  selectedItem,
  onAddActionClick,
  onEditActionClick,
  onDeleteActionClick,
  extraActions = [],
}: ActionBarProps<T>) {
  const strBtnAdd = '➕ Add';
  const strBtnEdit = '✏️ Edit';
  const strBtnDelete = '🗑️ Delete';

  const isActionDisabled = disabled || !selectedItem;

  const onEditHandler = () => {
    if (!selectedItem) {
      return;
    }

    onEditActionClick(selectedItem);
  };

  const onDeleteHandler = () => {
    if (!selectedItem) {
      return;
    }

    onDeleteActionClick(selectedItem);
  };

  const preparedExtraActions = extraActions.map((action, index) => {
    const onClickHandler = () => {
      if (!selectedItem) {
        return;
      }

      action.onClickHandler(selectedItem);
    };

    return {
      key: `${action.label}-${index}`,
      label: action.label,
      onClickHandler,
      disabled: isActionDisabled,
    };
  });

  return (
    <div
      aria-disabled={disabled}
      className={`mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${disabled ? "opacity-50 grayscale" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddActionClick}
          disabled={disabled}
          aria-disabled={disabled}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
        >
          {strBtnAdd}
        </button>

        <button
          type="button"
          onClick={onEditHandler}
          disabled={isActionDisabled}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
        >
          {strBtnEdit}
        </button>

        <button
          type="button"
          onClick={onDeleteHandler}
          disabled={isActionDisabled}
          className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-40 disabled:hover:bg-red-50"
        >
          {strBtnDelete}
        </button>

        {preparedExtraActions.map((action) => (
          <button
            type="button"
            key={action.key}
            onClick={action.onClickHandler}
            disabled={action.disabled}
            className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}