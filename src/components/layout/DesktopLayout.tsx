import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileDock } from "./MobileDock";

const DOCK_PAGES = new Set(["/", "/calendar"]);

export function DesktopLayout() {
  const location = useLocation();
  const isDockPage = DOCK_PAGES.has(location.pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9FD] sm:bg-white">
      {/* Desktop sidebar — always visible */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto styled-scrollbar">
        <div className={`px-4 pt-3 pb-5 sm:px-10 sm:py-8 animate-fade-in ${isDockPage ? 'pb-32 sm:pb-8' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom dock */}
      <MobileDock visible={isDockPage} />
    </div>
  );
}
