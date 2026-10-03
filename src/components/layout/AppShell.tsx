'use client';

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import GuestsList from "@/components/guests/GuestsList";
import HouseMapWorkspace from "@/components/houseMaps/HouseMapWorkspace";
import HousesList from "@/components/houses/HousesList";
import RetreatsList from "@/components/retreats/RetreatsList";
import RoomsList from "@/components/rooms/RoomsList";
import Sidebar from "@/components/layout/Sidebar";
import UserSelector from "@/components/layout/UserSelector";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export default function AppShell() {
  const strRetreats = "Retreats";
  const strGuests = "Guests";
  const strView = "View";
  const strCheckIn = "Check-in";
  const strRegistration = "Registration";
  const strHouses = "Houses";
  const strRooms = "Rooms";
  const strNotImplemented = "This interface is not implemented yet.";
  const strLoadingUser = "Loading user...";

  const { currentUser: user } = useCurrentUser();

  const [selectedMenu, setSelectedMenu] = useState("");

  const getMenuItems = (): string[] => {
    if (!user) {
      return [];
    }

    if (user.role === "admin") {
      return [
        strRetreats,
        strGuests,
        strView,
        strCheckIn,
        strRegistration,
        strHouses,
        strRooms,
      ];
    }

    if (user.role === "manager") {
      return [
        strView,
        strCheckIn,
        strRegistration,
      ];
    }

    if (user.role === "organizer") {
      return [
        strGuests,
        strView,
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const onMenuClick = (menu: string) => {
    setSelectedMenu(menu);
  };

  const interfaces: Record<string, () => ReactNode> = {
    "Retreats": () => <RetreatsList />,
    "Guests": () => <GuestsList />,
    "View": () => <HouseMapWorkspace openMode="normal" />,
    "Check-in": () => <HouseMapWorkspace openMode="check_in" />,
    "Registration": () => <HouseMapWorkspace openMode="registration" />,
    "Houses": () => <HousesList />,
    "Rooms": () => <RoomsList />,
  };

  const selectedInterface = interfaces[selectedMenu];
  const content = selectedInterface ? selectedInterface() : <div>{strNotImplemented}</div>;

  useEffect(() => {
    if (menuItems.length === 0) {
      setSelectedMenu("");
      return;
    }

    if (!menuItems.includes(selectedMenu)) {
      setSelectedMenu(menuItems[0]);
    }
  }, [user?.id, selectedMenu]);

  if (!user) {
    return <div className="p-6">{strLoadingUser}</div>;
  }

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
        <main className="min-w-0 flex-1 p-6">{content}</main>
      </div>
    </div>
  );
}