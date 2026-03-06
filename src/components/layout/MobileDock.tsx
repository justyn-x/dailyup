import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function MobileDock({ visible }: { visible: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isCalendar = location.pathname === '/calendar';

  return (
    <div
      className={`fixed bottom-10 left-6 right-6 h-16 z-50 sm:hidden glass-dock rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.12)] grid grid-cols-3 items-center transition-all duration-300 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-[120px] opacity-0 pointer-events-none'
      }`}
    >
      {/* Dashboard */}
      <button
        onClick={() => navigate('/')}
        className={`flex items-center justify-center h-full transition-colors ${
          isHome ? 'text-indigo-600' : 'text-slate-400'
        }`}
      >
        <FontAwesomeIcon icon="th-large" className="text-xl" />
      </button>

      {/* Create — raised center button */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => navigate('/create')}
          className="-mt-10 w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-300/50 active:scale-95 transition-transform"
        >
          <FontAwesomeIcon icon="plus" className="text-xl" />
        </button>
      </div>

      {/* Calendar */}
      <button
        onClick={() => navigate('/calendar')}
        className={`flex items-center justify-center h-full transition-colors ${
          isCalendar ? 'text-indigo-600' : 'text-slate-400'
        }`}
      >
        <FontAwesomeIcon icon="calendar-alt" className="text-xl" />
      </button>
    </div>
  );
}
