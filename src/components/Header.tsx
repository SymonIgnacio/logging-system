import { HiOutlineMenu } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center justify-between px-4 md:px-5">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-2xl p-1 rounded hover:bg-gray-100"
        aria-label="Open menu"
      >
        <HiOutlineMenu />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm font-semibold">School Logging System</p>
      </div>

      <div className="text-xs md:text-sm text-gray-600 capitalize">
        {user?.role || "user"}
      </div>
    </header>
  );
}
