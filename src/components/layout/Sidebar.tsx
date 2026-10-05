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
  const strWorkspace = "Ozen Retreats";
  const strWorkspaceCaption = "Workspace";
  const strWorkspaceGroup = "WORKSPACE";
  const strManageGroup = "MANAGE";
  const strMainNavigation = "Main navigation";
  const strWorkspaceInitial = "O";
  const retreatItems = menuItems.filter((label) => label !== "Admin");
  const manageItems = menuItems.filter((label) => label === "Admin");

  const prepareItems = (items: string[]) => items.map((label) => {
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
    <aside className="ozen-sidebar">
      <div className="ozen-brand" aria-label={strBrand}>
        <span className="ozen-brand-mark">{strBrandMark}</span>
        <span className="ozen-brand-copy"><strong>{strBrand}</strong><small>{strBrandCaption}</small></span>
      </div>
      <div className="ozen-workspace-card">
        <span className="ozen-workspace-avatar">{strWorkspaceInitial}</span>
        <span className="ozen-workspace-name"><strong>{strWorkspace}</strong><small>{strWorkspaceCaption}</small></span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><path d="m6 8 4 4 4-4" /></svg>
      </div>
      <nav className="ozen-side-nav" aria-label={strMainNavigation}>
        <div className="ozen-nav-group">
          <span className="ozen-nav-label">{strWorkspaceGroup}</span>
          {workspaceItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClickHandler}
              aria-current={item.isSelected ? "page" : undefined}
              className={item.isSelected ? "ozen-nav-item ozen-nav-item-active" : "ozen-nav-item"}
            >
              <NavIcon label={item.label} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        {adminItems.length > 0 ? (
          <div className="ozen-nav-group">
            <span className="ozen-nav-label">{strManageGroup}</span>
            {adminItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClickHandler}
                aria-current={item.isSelected ? "page" : undefined}
                className={item.isSelected ? "ozen-nav-item ozen-nav-item-active" : "ozen-nav-item"}
              >
                <NavIcon label={item.label} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
