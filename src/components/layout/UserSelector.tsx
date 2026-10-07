'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  maxFontLevel,
  minFontLevel,
  useFontSizeSettings,
} from "@/components/layout/FontSizeSettings";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export default function UserSelector() {
  const strCurrentUser = "Current user";
  const strLoading = "Loading users...";
  const strLoadError = "Failed to load users.";
  const strMobileMenu = "User menu";
  const strUsers = "Users";
  const strSettings = "Settings";
  const strFontSettings = "Settings";
  const strFontSize = "Font size";
  const strDefaultFontSize = "Default";
  const strClose = "Close";

  const {
    users,
    currentUser,
    setCurrentUser,
    isLoadingUsers,
    usersLoadError,
  } = useCurrentUser();
  const { fontLevel, setFontLevel } = useFontSizeSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFontSettingsOpen, setIsFontSettingsOpen] = useState(false);

  const onUserChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(event.target.value);
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    setCurrentUser(user);
  };

  const onMobileMenuToggle = () => {
    setIsMobileMenuOpen((isOpen) => !isOpen);
  };

  const onMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  const onSettingsClick = () => {
    setIsMobileMenuOpen(false);
    setIsFontSettingsOpen(true);
  };

  const onSettingsClose = () => {
    setIsFontSettingsOpen(false);
  };

  const onFontLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFontLevel(Number(event.target.value));
  };

  useEffect(() => {
    if (!isFontSettingsOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFontSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFontSettingsOpen]);

  const userOptions = users.map((user) => {
    return {
      id: user.id,
      label: `${user.name} (${user.role})`,
    };
  });
  const mobileUserRows = users.map((user) => {
    const onClickHandler = () => {
      setCurrentUser(user);
      onMobileMenuClose();
    };

    return {
      id: user.id,
      name: user.name,
      isSelected: currentUser?.id === user.id,
      onClickHandler,
    };
  });
  const fontLevelOptions = Array.from({ length: maxFontLevel - minFontLevel + 1 }, (_, index) => {
    const level = minFontLevel + index;

    return {
      level,
      label: level === minFontLevel ? strDefaultFontSize : `+${level} px`,
    };
  });
  const initials = currentUser?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "";

  return (
    <>
      <div className="ozen-mobile-user-menu">
        <button
          type="button"
          className="ozen-mobile-user-trigger"
          aria-label={strMobileMenu}
          aria-expanded={isMobileMenuOpen}
          onClick={onMobileMenuToggle}
        >
          <span className="ozen-user-avatar">{initials}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><path d="m6 8 4 4 4-4" /></svg>
        </button>
        {isMobileMenuOpen ? (
          <div className="ozen-mobile-user-dropdown" role="group" aria-label={strMobileMenu}>
            <span className="ozen-mobile-user-menu-heading">{strUsers}</span>
            {isLoadingUsers ? <span className="ozen-mobile-user-state">{strLoading}</span> : null}
            {usersLoadError ? <span className="ozen-mobile-user-state ozen-user-message-error">{strLoadError}</span> : null}
            {!isLoadingUsers && !usersLoadError ? mobileUserRows.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  aria-current={user.isSelected ? "true" : undefined}
                  className={user.isSelected ? "ozen-mobile-user-option ozen-mobile-user-option-active" : "ozen-mobile-user-option"}
                  onClick={user.onClickHandler}
                >
                  {user.name}
                </button>
              )) : null}
            <div className="ozen-mobile-user-menu-divider" />
            <button type="button" className="ozen-mobile-user-option" onClick={onSettingsClick}>
              {strSettings}
            </button>
          </div>
        ) : null}
      </div>
      {isLoadingUsers ? (
        <div className="ozen-user-message">{strLoading}</div>
      ) : usersLoadError ? (
        <div className="ozen-user-message ozen-user-message-error">{strLoadError}</div>
      ) : (
        <label className="ozen-user-selector" aria-label={strCurrentUser}>
          <span className="ozen-user-avatar">{initials}</span>
          <span className="ozen-user-copy">
            <strong>{currentUser?.name}</strong>
            <small>{currentUser?.role}</small>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><path d="m6 8 4 4 4-4" /></svg>
          <select value={currentUser?.id ?? ""} onChange={onUserChange}>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.label}</option>
            ))}
          </select>
        </label>
      )}
      {isFontSettingsOpen ? (
        <div className="ozen-modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="font-settings-title"
            className="ozen-form-modal ozen-font-settings-modal"
          >
            <div className="ozen-form-modal-header"><h2 id="font-settings-title">{strFontSettings}</h2></div>
            <div className="ozen-form-body">
              <label htmlFor="font-size-level" className="ozen-form-field">
                <span>{strFontSize}</span>
                <select id="font-size-level" value={fontLevel} onChange={onFontLevelChange}>
                  {fontLevelOptions.map((option) => (
                    <option key={option.level} value={option.level}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="ozen-form-footer">
                <button type="button" onClick={onSettingsClose} className="ozen-action-button ozen-action-button-secondary">{strClose}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
