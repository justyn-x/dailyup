import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function DesktopLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto styled-scrollbar">
        <div className="px-10 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
