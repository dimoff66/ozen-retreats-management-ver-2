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
  const strMobileMenu = "User menu";
  const strSettings = "Settings";
  const strFontSettings = "Settings";
  const strFontSize = "Font size";
  const strDefaultFontSize = "Default";
  const strClose = "Close";
  const strLogout = "Log out";
  const strLoggingOut = "Logging out...";
  const { currentUser } = useCurrentUser();
  const { fontLevel, setFontLevel } = useFontSizeSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFontSettingsOpen, setIsFontSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onMobileMenuToggle = () => {
    setIsMobileMenuOpen(isOpen => !isOpen);
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

  const onLogoutClick = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
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

  const fontLevelOptions = Array.from({ length: maxFontLevel - minFontLevel + 1 }, (_, index) => {
    const level = minFontLevel + index;

    return {
      level,
      label: level === minFontLevel ? strDefaultFontSize : `+${level} px`,
    };
  });
  const initials = currentUser.name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="project-mobile-user-menu">
        <button
          type="button"
          className="project-mobile-user-trigger"
          aria-label={strMobileMenu}
          aria-expanded={isMobileMenuOpen}
          onClick={onMobileMenuToggle}
        >
          <span className="project-user-avatar">{initials}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><path d="m6 8 4 4 4-4" /></svg>
        </button>
        {isMobileMenuOpen && (
          <div className="project-mobile-user-dropdown" role="group" aria-label={strMobileMenu}>
            <div className="project-mobile-user-identity">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.role}</small>
            </div>
            <div className="project-mobile-user-menu-divider" />
            <button type="button" className="project-mobile-user-option" onClick={onSettingsClick}>{strSettings}</button>
            <button type="button" className="project-mobile-user-option" onClick={onLogoutClick} disabled={isLoggingOut}>{isLoggingOut ? strLoggingOut : strLogout}</button>
          </div>
        )}
      </div>
      <div className="project-user-selector project-user-selector-static" aria-label={strCurrentUser}>
        <span className="project-user-avatar">{initials}</span>
        <span className="project-user-copy">
          <strong>{currentUser.name}</strong>
          <small>{currentUser.role}</small>
        </span>
        <button type="button" onClick={onLogoutClick} disabled={isLoggingOut} className="project-user-logout-button">{isLoggingOut ? strLoggingOut : strLogout}</button>
      </div>
      {isFontSettingsOpen && (
        <div className="project-modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="font-settings-title"
            className="project-form-modal project-font-settings-modal"
          >
            <div className="project-form-modal-header"><h2 id="font-settings-title">{strFontSettings}</h2></div>
            <div className="project-form-body">
              <label htmlFor="font-size-level" className="project-form-field">
                <span>{strFontSize}</span>
                <select id="font-size-level" value={fontLevel} onChange={onFontLevelChange}>
                  {fontLevelOptions.map(option => (
                    <option key={option.level} value={option.level}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="project-form-footer">
                <button type="button" onClick={onSettingsClose} className="project-action-button project-action-button-secondary">{strClose}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
