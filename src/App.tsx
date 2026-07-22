import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import { AdminProvider } from './context/AdminContext';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem('page-has-been-reloaded');
    try {
      const component = await componentImport();
      sessionStorage.removeItem('page-has-been-reloaded');
      return component;
    } catch (error) {
      if (!pageHasBeenReloaded) {
        sessionStorage.setItem('page-has-been-reloaded', 'true');
        window.location.reload();
        return new Promise<any>(() => {});
      }
      throw error;
    }
  });

const Home = lazyWithRetry(() => import('./pages/Home'));
const Membership = lazyWithRetry(() => import('./pages/Membership'));
const Events = lazyWithRetry(() => import('./pages/Events'));
const Association = lazyWithRetry(() => import('./pages/Association'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const MyRegistrations = lazyWithRetry(() => import('./pages/MyRegistrations'));
const ArchivedEvents = lazyWithRetry(() => import('./pages/ArchivedEvents'));
const Calendar = lazyWithRetry(() => import('./pages/Calendar'));
const EventDetail = lazyWithRetry(() => import('./pages/EventDetail'));
const MembershipApplication = lazyWithRetry(() => import('./pages/MembershipApplication'));
const AssociateMemberApplication = lazyWithRetry(() => import('./pages/AssociateMemberApplication'));
const Benefits = lazyWithRetry(() => import('./pages/Benefits'));
const MembersDirectory = lazyWithRetry(() => import('./pages/MembersDirectory'));
const AccreditedClinics = lazyWithRetry(() => import('./pages/AccreditedClinics'));
const FindAVet = lazyWithRetry(() => import('./pages/FindAVet'));
const AccreditationManager = lazyWithRetry(() => import('./pages/AccreditationManager'));
const Committees = lazyWithRetry(() => import('./pages/Committees'));
const CommitteeDetail = lazyWithRetry(() => import('./pages/CommitteeDetail'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const AdminLogin = lazyWithRetry(() => import('./pages/AdminLogin'));
const MemberLogin = lazyWithRetry(() => import('./pages/MemberLogin'));
const AuthAction = lazyWithRetry(() => import('./pages/AuthAction'));
const MemberDashboard = lazyWithRetry(() => import('./pages/MemberDashboard'));
const PaymentPage = lazyWithRetry(() => import('./pages/PaymentPage'));
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess'));
const PaymentPending = lazyWithRetry(() => import('./pages/PaymentPending'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const AccreditationRequirements = lazyWithRetry(() => import('./pages/AccreditationRequirements'));
const Sitemap = lazyWithRetry(() => import('./pages/Sitemap'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
import { CustomNotificationProvider } from './context/CustomNotificationContext';

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <CustomNotificationProvider>
          <Router unstable_useTransitions={true}>
            <ScrollToTop />
            <Layout>
              <ErrorBoundary>
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/membership" element={<Membership />} />
                    <Route path="/membership/application" element={<MembershipApplication />} />
                    <Route path="/membership/associate-application" element={<AssociateMemberApplication />} />
                    <Route path="/membership/benefits" element={<Benefits />} />
                    <Route path="/membership/directory" element={<MembersDirectory />} />
                    <Route path="/membership/accredited-clinics" element={<AccreditedClinics />} />
                    <Route path="/membership/accreditation-requirements" element={<AccreditationRequirements />} />
                    <Route path="/find-a-vet" element={<FindAVet />} />
                    <Route path="/accreditation" element={<Navigate to="/members" replace />} />
                    <Route path="/accreditation/admin" element={<AccreditationManager />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/about-us" element={<Association />} />
                    <Route path="/committees" element={<Committees />} />
                    <Route path="/committees/:id" element={<CommitteeDetail />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/my-registrations" element={<MyRegistrations />} />
                    <Route path="/my-registrations/archive" element={<ArchivedEvents />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/membership/payment" element={<PaymentPage />} />
                    <Route path="/membership/payment/success" element={<PaymentSuccess />} />
                    <Route path="/membership/payment/pending" element={<PaymentPending />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-pending" element={<PaymentPending />} />
                    {/* --- Auth Protected Routes --- */}
                    <Route
                      path="/admin/*"
                      element={
                        <ProtectedRoute adminOnly>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/login" element={<MemberLogin />} />
                    <Route path="/auth/action" element={<AuthAction />} />
                    <Route path="/member/dashboard" element={<Navigate to="/members" replace />} />
                    <Route
                      path="/members"
                      element={
                        <ProtectedRoute>
                          <MemberDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/sitemap" element={<Sitemap />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Layout>
          </Router>
        </CustomNotificationProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;