'use client';

import { useState } from "react";
import Sidebar from "./Sidebar";
import RetreatsList from "@/components/retreats/RetreatsList";
import HousesList from "@/components/houses/HousesList";
import RoomsList from "@/components/rooms/RoomsList";
import GuestsList from "../guests/GuestsList";

export default function AppShell() {
  const strNotImplemented = "This interface is not implemented yet.";

  const [selectedMenu, setSelectedMenu] = useState("Retreats");

  const onMenuClick = (menu: string) => {
    setSelectedMenu(menu);
  };

  const interfaces: Record<string, () => React.ReactNode> = {
  "Retreats": () => <RetreatsList />,
  "Houses": () => <HousesList />,
  "Guests": () => <GuestsList />,
  "Rooms": () => <RoomsList />,
};

  const selectedInterface = interfaces[selectedMenu];
  const content = selectedInterface ? selectedInterface() : <div>{strNotImplemented}</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar selectedMenu={selectedMenu} onMenuClick={onMenuClick} />
      <main className="flex-1 p-6">{content}</main>
    </div>
  );
}