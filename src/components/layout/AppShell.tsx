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
  const strLoadingUser = "Loading user...";

  const { currentUser: user } = useCurrentUser();

  const [selectedMenu, setSelectedMenu] = useState("Retreats");
  const [selectedAdminSection, setSelectedAdminSection] = useState("Houses");
  const menuItems = user?.role === "admin" ? [strRetreats, "Admin"] : [];

  const onMenuClick = (menu: string) => {
    setSelectedMenu(menu);
  };

  if (!user) {
    return <div className="p-6">{strLoadingUser}</div>;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <header className="mb-6 flex justify-end">
          <UserSelector />
        </header>
        <RetreatWorkspace key={user.id} />
      </div>
    );
  }

  const adminSections = ["Houses", "Rooms", "Retreats", "Users"];
  const adminSectionContent = selectedAdminSection === "Houses"
    ? <HousesList />
    : selectedAdminSection === "Rooms"
      ? <RoomsList />
      : selectedAdminSection === "Users"
        ? <UsersList />
        : <RetreatsList />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex shrink-0 justify-end border-b border-gray-200 bg-white px-6 py-3">
        <UserSelector />
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar
          menuItems={menuItems}
          selectedMenu={selectedMenu}
          onMenuClick={onMenuClick}
        />
        <main className="min-w-0 flex-1 p-6">
          {selectedMenu === "Retreats" ? <RetreatWorkspace key={user.id} /> : (
            <div>
              <nav aria-label="Administration sections" className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
                {adminSections.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setSelectedAdminSection(section)}
                    aria-current={selectedAdminSection === section ? "page" : undefined}
                    className={selectedAdminSection === section
                      ? "border-b-2 border-blue-600 px-4 py-2 font-semibold text-blue-700"
                      : "px-4 py-2 text-gray-600 hover:text-gray-900"}
                  >
                    {section}
                  </button>
                ))}
              </nav>
              {adminSectionContent}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}