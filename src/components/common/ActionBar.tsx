'use client';

import React from 'react';
import type { ReactNode } from "react";

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
  extraContent?: ReactNode;
  extraContentPosition?: "left" | "right";
}

export default function ActionBar<T>({
  disabled = false,
  selectedItem,
  onAddActionClick,
  onEditActionClick,
  onDeleteActionClick,
  extraActions = [],
  extraContent,
  extraContentPosition = "left",
}: ActionBarProps<T>) {
  const strBtnAdd = 'Add';
  const strBtnEdit = 'Edit';
  const strBtnDelete = 'Delete';

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
      className={`project-action-bar ${extraContent ? "project-action-bar-with-content" : ""}`}
    >
      {extraContent && extraContentPosition === "left" && (
        <div className="project-action-bar-content">{extraContent}</div>
      )}
      <div className={`project-action-buttons ${disabled ? "opacity-50 grayscale" : ""}`}>
        <button
          type="button"
          onClick={onAddActionClick}
          disabled={disabled}
          aria-disabled={disabled}
          className="project-action-button project-action-button-primary"
        >
          {strBtnAdd}
        </button>

        <button
          type="button"
          onClick={onEditHandler}
          disabled={isActionDisabled}
          className="project-action-button project-action-button-secondary"
        >
          {strBtnEdit}
        </button>

        <button
          type="button"
          onClick={onDeleteHandler}
          disabled={isActionDisabled}
          className="project-action-button project-action-button-danger"
        >
          {strBtnDelete}
        </button>

        {preparedExtraActions.map(action => (
          <button
            type="button"
            key={action.key}
            onClick={action.onClickHandler}
            disabled={action.disabled}
            className="project-action-button project-action-button-secondary"
          >
            {action.label}
          </button>
        ))}
      </div>
      {extraContent && extraContentPosition === "right" && (
        <div className="project-action-bar-content project-action-bar-content-right">{extraContent}</div>
      )}
    </div>
  );
}