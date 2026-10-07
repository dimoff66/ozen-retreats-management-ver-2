'use client';

import { useState } from "react";
import HousesList from "@/components/houses/HousesList";
import RetreatWorkspace from "@/components/retreats/RetreatWorkspace";
import RetreatsList from "@/components/retreats/RetreatsList";
import RoomsList from "@/components/rooms/RoomsList";
import UsersList from "@/components/users/UsersList";
import Sidebar from "@/components/layout/Sidebar";
import UserSelector from "@/components/layout/UserSelector";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export default function AppShell() {
  const strRetreats = "Retreats";
  const strAdmin = "Admin";
  const strLoadingUser = "Loading user...";
  const strAdministration = "Administration";
  const strAdministrationCaption = "Manage workspace settings and reference data.";
  const strAdministrationSections = "Administration sections";

  const { currentUser: user } = useCurrentUser();

  const [selectedMenu, setSelectedMenu] = useState(strRetreats);
  const [selectedAdminSection, setSelectedAdminSection] = useState("Houses");
  const isAdmin = user?.role === "admin";
  const menuItems = isAdmin ? [strRetreats, strAdmin] : [];
  const adminSections = ["Houses", "Rooms", "Retreats", "Users"];

  const onMenuClick = (menu: string) => {
    setSelectedMenu(menu);
  };

  const adminSectionRows = adminSections.map((section) => {
    const onClickHandler = () => {
      setSelectedAdminSection(section);
    };

    return {
      label: section,
      isSelected: selectedAdminSection === section,
      onClickHandler,
    };
  });

  if (!user) {
    return <div className="p-6">{strLoadingUser}</div>;
  }

  const adminSectionContent = selectedAdminSection === "Houses"
    ? <HousesList />
    : selectedAdminSection === "Rooms"
      ? <RoomsList />
      : selectedAdminSection === "Users"
        ? <UsersList />
        : <RetreatsList />;

  return (
    <div className="ozen-app-shell">
      <div className="ozen-side-slot ozen-side-slot-left">
        {isAdmin ? (
          <Sidebar
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            onMenuClick={onMenuClick}
          />
        ) : null}
      </div>
      <div className="ozen-center-column">
        <header className="ozen-topbar">
          <UserSelector />
        </header>
        <main className="ozen-page-content">
          {!isAdmin || selectedMenu === strRetreats ? <RetreatWorkspace key={user.id} /> : (
            <section className="ozen-admin-screen">
              <div className="ozen-page-heading">
                <div>
                  <p className="ozen-eyebrow">{strAdmin}</p>
                  <h1>{strAdministration}</h1>
                  <p>{strAdministrationCaption}</p>
                </div>
              </div>
              <nav aria-label={strAdministrationSections} className="ozen-tabs">
                {adminSectionRows.map((section) => (
                  <button
                    key={section.label}
                    type="button"
                    onClick={section.onClickHandler}
                    aria-current={section.isSelected ? "page" : undefined}
                    className={section.isSelected ? "ozen-tab ozen-tab-active" : "ozen-tab"}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
              <div className="ozen-admin-content">{adminSectionContent}</div>
            </section>
          )}
        </main>
      </div>
      <div className="ozen-side-slot ozen-side-slot-right" aria-hidden="true" />
    </div>
  );
}
