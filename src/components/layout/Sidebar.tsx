'use client';

type SidebarProps = {
  menuItems: string[];
  selectedMenu: string;
  onMenuClick: (menu: string) => void;
};

function NavIcon({ label }: { label: string }) {
  if (label === "Admin") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="1.8">
        <path d="M12 3.5 14 6l3.2-.2.8 3.1 2.7 1.7-1.7 2.7.2 3.2-3.1.8L14.5 20l-2.5-1.7L9.5 20l-1.6-2.7-3.1-.8.2-3.2-1.7-2.7L6 8.9l.8-3.1L10 6l2-2.5Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

export default function Sidebar({
  menuItems,
  selectedMenu,
  onMenuClick,
}: SidebarProps) {
  const strBrand = "ozen";
  const strBrandMark = "✦";
  const strBrandCaption = "RETREAT MANAGEMENT";
  const strWorkspaceGroup = "WORKSPACE";
  const strManageGroup = "MANAGE";
  const strMainNavigation = "Main navigation";
  const retreatItems = menuItems.filter(label => label !== "Admin");
  const manageItems = menuItems.filter(label => label === "Admin");

  const prepareItems = (items: string[]) => items.map(label => {
    const onClickHandler = () => {
      onMenuClick(label);
    };

    return {
      label,
      isSelected: selectedMenu === label,
      onClickHandler,
    };
  });

  const workspaceItems = prepareItems(retreatItems);
  const adminItems = prepareItems(manageItems);

  return (
    <aside className="project-sidebar">
      <div className="project-brand" aria-label={strBrand}>
        <span className="project-brand-mark">{strBrandMark}</span>
        <span className="project-brand-copy"><strong>{strBrand}</strong><small>{strBrandCaption}</small></span>
      </div>
      <nav className="project-side-nav" aria-label={strMainNavigation}>
        <div className="project-nav-group">
          <span className="project-nav-label">{strWorkspaceGroup}</span>
          {workspaceItems.map(item => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClickHandler}
              aria-current={item.isSelected ? "page" : undefined}
              className={item.isSelected ? "project-nav-item project-nav-item-active" : "project-nav-item"}
            >
              <NavIcon label={item.label} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        {adminItems.length > 0 && (
          <div className="project-nav-group">
            <span className="project-nav-label">{strManageGroup}</span>
            {adminItems.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClickHandler}
                aria-current={item.isSelected ? "page" : undefined}
                className={item.isSelected ? "project-nav-item project-nav-item-active" : "project-nav-item"}
              >
                <NavIcon label={item.label} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
