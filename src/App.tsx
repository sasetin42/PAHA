import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import { AdminProvider } from './context/AdminContext';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Membership = lazy(() => import('./pages/Membership'));
const Events = lazy(() => import('./pages/Events'));
const Association = lazy(() => import('./pages/Association'));
const Contact = lazy(() => import('./pages/Contact'));
const MyRegistrations = lazy(() => import('./pages/MyRegistrations'));
const ArchivedEvents = lazy(() => import('./pages/ArchivedEvents'));
const Calendar = lazy(() => import('./pages/Calendar'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const MembershipApplication = lazy(() => import('./pages/MembershipApplication'));
const AssociateMemberApplication = lazy(() => import('./pages/AssociateMemberApplication'));
const Benefits = lazy(() => import('./pages/Benefits'));
const MembersDirectory = lazy(() => import('./pages/MembersDirectory'));
const AccreditedClinics = lazy(() => import('./pages/AccreditedClinics'));
const FindAVet = lazy(() => import('./pages/FindAVet'));
const AccreditationManager = lazy(() => import('./pages/AccreditationManager'));
const Committees = lazy(() => import('./pages/Committees'));
const CommitteeDetail = lazy(() => import('./pages/CommitteeDetail'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const MemberLogin = lazy(() => import('./pages/MemberLogin'));
const AuthAction = lazy(() => import('./pages/AuthAction'));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentPending = lazy(() => import('./pages/PaymentPending'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const AccreditationRequirements = lazy(() => import('./pages/AccreditationRequirements'));
const Sitemap = lazy(() => import('./pages/Sitemap'));
const NotFound = lazy(() => import('./pages/NotFound'));
import { CustomNotificationProvider } from './context/CustomNotificationContext';

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <CustomNotificationProvider>
          <Router>
            <ScrollToTop />
            <Layout>
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
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