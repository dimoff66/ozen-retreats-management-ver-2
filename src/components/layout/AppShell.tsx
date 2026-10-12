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

  const adminSectionRows = adminSections.map(section => {
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
    <div className="project-app-shell">
      <div className="project-side-slot project-side-slot-left">
        {isAdmin && (
          <Sidebar
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            onMenuClick={onMenuClick}
          />
        )}
      </div>
      <div className="project-center-column">
        <header className="project-topbar">
          <UserSelector />
        </header>
        <main className="project-page-content">
          {!isAdmin || selectedMenu === strRetreats ? <RetreatWorkspace key={user.id} /> : (
            <section className="project-admin-screen">
              <div className="project-page-heading">
                <div>
                  <p className="project-eyebrow">{strAdmin}</p>
                  <h1>{strAdministration}</h1>
                  <p>{strAdministrationCaption}</p>
                </div>
              </div>
              <nav aria-label={strAdministrationSections} className="project-tabs">
                {adminSectionRows.map(section => (
                  <button
                    key={section.label}
                    type="button"
                    onClick={section.onClickHandler}
                    aria-current={section.isSelected ? "page" : undefined}
                    className={section.isSelected ? "project-tab project-tab-active" : "project-tab"}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
              <div className="project-admin-content">{adminSectionContent}</div>
            </section>
          )}
        </main>
      </div>
      <div className="project-side-slot project-side-slot-right" aria-hidden="true" />
    </div>
  );
}
