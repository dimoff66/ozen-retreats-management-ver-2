'use client';

type SidebarProps = {
  menuItems: string[];
  selectedMenu: string;
  onMenuClick: (menu: string) => void;
};

export default function Sidebar({
  menuItems,
  selectedMenu,
  onMenuClick,
}: SidebarProps) {
  const preparedMenuItems = menuItems.map((label) => {
    const isSelected = selectedMenu === label;

    const onClickHandler = () => {
      onMenuClick(label);
    };

    return {
      label,
      isSelected,
      onClickHandler,
    };
  });

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
      <nav className="flex flex-col gap-1">
        {preparedMenuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClickHandler}
            className={
              item.isSelected
                ? "rounded-md bg-blue-600 px-4 py-2 text-left font-semibold text-white"
                : "rounded-md px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
            }
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}