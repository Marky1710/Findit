import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StudentAuthModal } from './StudentAuthModal';
import { UserAvatar } from './UserAvatar';
import { 
  Compass, 
  ShieldCheck, 
  User as UserIcon, 
  Menu, 
  X,
  ChevronDown,
  LogOut,
  Laptop,
  GraduationCap,
  LogIn,
  UserPlus
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    currentPage, 
    setCurrentPage, 
    unreadCount, 
    pendingClaimsCount,
    pendingVerificationsCount,
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    logout,
    isLoggingOut
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Automatically close all user popovers immediately when logged out or logging out
  useEffect(() => {
    if (!currentUser || isLoggingOut) {
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
    }
  }, [currentUser, isLoggingOut]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <button
                id="brand-logo-btn"
                onClick={() => setCurrentPage('home')}
                className="flex items-center space-x-2.5 text-left group focus:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-blue-900 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                      Find<span className="text-blue-600">It</span>
                    </span>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                      IYC Mumbai
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block font-medium leading-none mt-0.5">
                    Ismail Yusuf College • Jogeshwari (E)
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                id="nav-link-home"
                onClick={() => setCurrentPage('home')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === 'home'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Home
              </button>

              <button
                id="nav-link-browse"
                onClick={() => setCurrentPage('browse')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === 'browse'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Browse Items
              </button>

              {/* Action buttons available to all visitors */}
              <button
                id="nav-link-report-lost"
                onClick={() => setCurrentPage('report-lost')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  currentPage === 'report-lost'
                    ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-200'
                    : 'bg-red-50/50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700'
                }`}
              >
                + Report Lost
              </button>

              <button
                id="nav-link-report-found"
                onClick={() => setCurrentPage('report-found')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  currentPage === 'report-found'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                    : 'bg-emerald-50/50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700'
                }`}
              >
                + Report Found
              </button>

              {/* Logged in role-specific views */}
              {currentUser && (
                <>
                  <button
                    id="nav-link-dashboard"
                    onClick={() => setCurrentPage('dashboard')}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors relative ${
                      currentPage === 'dashboard'
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Dashboard
                    {(unreadCount > 0 || pendingClaimsCount > 0) && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                        {unreadCount + pendingClaimsCount}
                      </span>
                    )}
                  </button>

                  {/* Staff Verification Portal */}
                  {(currentUser.role === 'staff' || currentUser.role === 'admin') && (
                    <button
                      id="nav-link-staff-portal"
                      onClick={() => setCurrentPage('staff-dashboard')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-colors relative ${
                        currentPage === 'staff-dashboard'
                          ? 'bg-blue-800 text-white shadow-xs font-bold'
                          : 'text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Staff Portal</span>
                      {pendingVerificationsCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow-xs">
                          {pendingVerificationsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Admin Console */}
                  {currentUser.role === 'admin' && (
                    <button
                      id="nav-link-admin-console"
                      onClick={() => setCurrentPage('admin')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-colors ${
                        currentPage === 'admin'
                          ? 'bg-indigo-900 text-white shadow-xs font-bold'
                          : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      <Laptop className="w-4 h-4 text-indigo-500" />
                      <span>Admin Console</span>
                    </button>
                  )}
                </>
              )}
            </nav>

            {/* Right Side: Auth controls */}
            <div className="flex items-center space-x-2">
              {(!currentUser || isLoggingOut) ? (
                <div className="flex items-center space-x-2">
                  <button
                    id="nav-signin-btn"
                    onClick={() => openAuthModal('student-login')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sign In</span>
                  </button>

                  <button
                    id="nav-register-btn"
                    onClick={() => openAuthModal('student-register')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </div>
              ) : (
                /* Authenticated User Menu (Clean - NO Persona Switcher) */
                <div className="relative">
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <UserAvatar
                      name={currentUser.name}
                      role={currentUser.role}
                      size="sm"
                      className="rounded-lg"
                    />
                    <div className="text-left hidden lg:block pr-1">
                      <div className="text-xs font-bold text-slate-800 leading-tight flex items-center space-x-1">
                        <span>{currentUser.name.split(' ')[0]}</span>
                        <span className={`text-[9px] font-bold px-1 rounded uppercase ${
                          currentUser.role === 'admin' 
                            ? 'bg-indigo-100 text-indigo-800'
                            : currentUser.role === 'staff'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {currentUser.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                        {currentUser.studentId || currentUser.department || 'IYC Member'}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* User Profile Dropdown */}
                  {userMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onMouseLeave={() => setUserMenuOpen(false)}
                    >
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged In Account</div>
                        <div className="font-bold text-sm text-slate-900 mt-0.5 flex items-center justify-between">
                          <span className="truncate">{currentUser.name}</span>
                          <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                            currentUser.role === 'admin' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : currentUser.role === 'staff' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {currentUser.role}
                          </span>
                        </div>
                        {currentUser.studentId && (
                          <div className="text-xs text-blue-700 font-mono font-semibold mt-1">
                            ID: {currentUser.studentId}
                          </div>
                        )}
                        {currentUser.course && (
                          <div className="text-xs text-slate-600 mt-0.5">{currentUser.course}</div>
                        )}
                        {currentUser.email && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">{currentUser.email}</div>
                        )}
                      </div>

                      <div className="py-1 px-2 space-y-0.5">
                        <button
                          id="dropdown-my-dashboard-btn"
                          onClick={() => {
                            setCurrentPage('dashboard');
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                        >
                          <UserIcon className="w-4 h-4 text-slate-500" />
                          <span>My Dashboard &amp; Claims</span>
                        </button>

                        {(currentUser.role === 'staff' || currentUser.role === 'admin') && (
                          <button
                            id="dropdown-staff-portal-btn"
                            onClick={() => {
                              setCurrentPage('staff-dashboard');
                              setUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center space-x-2"
                          >
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            <span>CS Verification Portal</span>
                          </button>
                        )}

                        {currentUser.role === 'admin' && (
                          <button
                            id="dropdown-admin-btn"
                            onClick={() => {
                              setCurrentPage('admin');
                              setUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center space-x-2"
                          >
                            <Laptop className="w-4 h-4 text-indigo-600" />
                            <span>Admin Console</span>
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1 px-2">
                        <button
                          id="nav-logout-btn"
                          disabled={isLoggingOut}
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  id="mobile-menu-toggle-btn"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
            <button
              onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Home
            </button>
            <button
              onClick={() => { setCurrentPage('browse'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Browse Items
            </button>
            <button
              onClick={() => { setCurrentPage('report-lost'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              + Report Lost Item
            </button>
            <button
              onClick={() => { setCurrentPage('report-found'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              + Report Found Item
            </button>

            {currentUser ? (
              <>
                <button
                  onClick={() => { setCurrentPage('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  My Dashboard
                </button>
                {(currentUser.role === 'staff' || currentUser.role === 'admin') && (
                  <button
                    onClick={() => { setCurrentPage('staff-dashboard'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Staff Verification Portal
                  </button>
                )}
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => { setCurrentPage('admin'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    Admin Dashboard
                  </button>
                )}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    id="mobile-nav-logout-btn"
                    disabled={isLoggingOut}
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isLoggingOut ? 'Logging out...' : `Log Out (${currentUser.name})`}
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => { openAuthModal('student-login'); setMobileMenuOpen(false); }}
                  className="flex-1 py-2 text-center text-xs font-bold bg-slate-100 text-slate-700 rounded-xl"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { openAuthModal('student-register'); setMobileMenuOpen(false); }}
                  className="flex-1 py-2 text-center text-xs font-bold bg-blue-600 text-white rounded-xl"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Student & Staff Auth Modal */}
      <StudentAuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
      />
    </>
  );
};
