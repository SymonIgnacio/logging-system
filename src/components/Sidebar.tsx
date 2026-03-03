import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUpload,
  FiBookOpen,
  FiBarChart2,
  FiLogOut,
  FiUser,
  FiMenu,
  FiChevronLeft,
} from "react-icons/fi";
import { useState, type JSX } from "react";
import { useAuth } from "../context/AuthContext";

interface MenuItem {
  name: string;
  path: string;
  icon: JSX.Element;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const menuItems: MenuItem[] = user?.role === "admin"
    ? [
        { name: "Dashboard", path: "/", icon: <FiHome size={18} /> },
        { name: "Import Data", path: "/import-data", icon: <FiUpload size={18} /> },
        { name: "Class Tracker", path: "/class-tracker", icon: <FiBookOpen size={18} /> },
        { name: "Report", path: "/report", icon: <FiBarChart2 size={18} /> },
      ]
    : [
        { name: "Class Logger", path: "/class-logger", icon: <FiBookOpen size={18} /> },
      ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/35 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-50 top-0 left-0 h-full bg-white border-r border-gray-200 shadow-xl transform transition-all duration-200 flex flex-col
        ${collapsed ? "w-16" : "w-56"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:shadow-none`}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          {!collapsed && (
            <span className="text-sm font-bold whitespace-nowrap truncate">Logging System</span>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose();
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
          >
            {collapsed ? <FiMenu size={18} /> : <FiChevronLeft size={18} />}
          </button>
        </div>

        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
          <div className="bg-gray-100 p-2 rounded-lg">
            <FiUser size={16} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-medium text-sm whitespace-nowrap truncate">
                {user?.role === "admin"
                  ? "Admin"
                  : `Grade ${user?.grade || "-"}-${user?.section || "-"}`}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || "user"}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2.5 space-y-1.5">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-sm ${isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="flex-shrink-0">
                {item.icon}
              </span>

              {!collapsed && (
                <span className="whitespace-nowrap truncate">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2.5 mt-auto border-t border-gray-200">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition text-sm"
          >
            <FiLogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
