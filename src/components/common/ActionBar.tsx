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

export default function ActionBar<T>(props: ActionBarProps<T>) {
  const strBtnAdd = 'Add';
  const strBtnEdit = 'Edit';
  const strBtnDelete = 'Delete';

  const isActionDisabled = (props.disabled ?? false) || !props.selectedItem;

  const onEditHandler = () => {
    if (!props.selectedItem) {
      return;
    }

    props.onEditActionClick(props.selectedItem);
  };

  const onDeleteHandler = () => {
    if (!props.selectedItem) {
      return;
    }

    props.onDeleteActionClick(props.selectedItem);
  };

  const preparedExtraActions = (props.extraActions ?? []).map((action, index) => {
    const onClickHandler = () => {
      if (!props.selectedItem) {
        return;
      }

      action.onClickHandler(props.selectedItem);
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
      aria-disabled={(props.disabled ?? false)}
      className={`project-action-bar ${props.extraContent ? "project-action-bar-with-content" : ""}`}
    >
      {props.extraContent && (props.extraContentPosition ?? "left") === "left" && (
        <div className="project-action-bar-content">{props.extraContent}</div>
      )}
      <div className={`project-action-buttons ${(props.disabled ?? false) ? "opacity-50 grayscale" : ""}`}>
        <button
          type="button"
          onClick={props.onAddActionClick}
          disabled={(props.disabled ?? false)}
          aria-disabled={(props.disabled ?? false)}
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
      {props.extraContent && (props.extraContentPosition ?? "left") === "right" && (
        <div className="project-action-bar-content project-action-bar-content-right">{props.extraContent}</div>
      )}
    </div>
  );
}