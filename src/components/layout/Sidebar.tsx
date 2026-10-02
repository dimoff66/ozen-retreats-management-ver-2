'use client';

type SidebarProps = {
  selectedMenu: string;
  onMenuClick: (menu: string) => void;
};

export default function Sidebar({
  selectedMenu,
  onMenuClick,
}: SidebarProps) {
  const strRetreats = "Retreats";
  const strGuests = "Guests";
  const strHouses = "Houses";
  const strRooms = "Rooms";
  const strTaxi = "Taxi";
  const strUsers = "Users";

  const menuItems = [
    strRetreats,
    strGuests,
    strHouses,
    strRooms,

    strTaxi,
    strUsers,
  ];

  const preparedMenuItems = menuItems.map((menuItem) => {
    const isSelected = menuItem === selectedMenu;

    const onClickHandler = () => {
      onMenuClick(menuItem);
    };

    return {
      label: menuItem,
      isSelected,
      onClickHandler,
    };
  });

  return (
    <aside className="w-64 border-r border-gray-200 bg-white p-4">
      <nav className="flex flex-col gap-2">
        {preparedMenuItems.map((menuItem) => (
          <button
            key={menuItem.label}
            onClick={menuItem.onClickHandler}
            className={menuItem.isSelected ? "rounded-md bg-blue-600 px-4 py-2 text-left text-sm font-medium text-white" : "rounded-md px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"}
          >
            {menuItem.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}