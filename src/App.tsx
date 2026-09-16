import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { BrowseView } from './views/BrowseView';
import { ReportLostView } from './views/ReportLostView';
import { ReportFoundView } from './views/ReportFoundView';
import { ItemDetailsView } from './views/ItemDetailsView';
import { DashboardView } from './views/DashboardView';
import { StaffDashboardView } from './views/StaffDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { ContactModal } from './components/ContactModal';
import { EditItemModal } from './components/EditItemModal';
import { ClaimModal } from './components/ClaimModal';
import { ClaimReviewModal } from './components/ClaimReviewModal';

const AppContent: React.FC = () => {
  const { 
    currentPage, 
    activeContactItem, 
    closeContactModal,
    activeClaimItem,
    activeReviewClaim,
    closeReviewClaimModal,
    activeEditItem,
    closeEditModal
  } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentPage === 'home' && <HomeView />}
        {currentPage === 'browse' && <BrowseView />}
        {currentPage === 'report-lost' && <ReportLostView />}
        {currentPage === 'report-found' && <ReportFoundView />}
        {currentPage === 'item-details' && <ItemDetailsView />}
        {currentPage === 'dashboard' && <DashboardView />}
        {currentPage === 'staff-dashboard' && <StaffDashboardView />}
        {currentPage === 'admin' && <AdminDashboardView />}
      </main>

      {/* Safe Contact In-App Messaging Modal */}
      {activeContactItem && (
        <ContactModal
          item={activeContactItem}
          onClose={closeContactModal}
        />
      )}

      {/* Ownership Claim Submission Modal */}
      {activeClaimItem && <ClaimModal />}

      {/* Ownership Verification & Handover Review Modal */}
      {activeReviewClaim && (
        <ClaimReviewModal
          claim={activeReviewClaim}
          onClose={closeReviewClaimModal}
        />
      )}

      {/* Edit Listing Modal */}
      {activeEditItem && (
        <EditItemModal
          item={activeEditItem}
          onClose={closeEditModal}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
