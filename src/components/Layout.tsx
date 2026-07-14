import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieConsent from './CookieConsent';
import PublicChatbot from './chatbot/PublicChatbot';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();

    const isExcluded =
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/auth') ||
        location.pathname === '/login' ||
        location.pathname === '/members' || location.pathname.startsWith('/members/') ||
        location.pathname.startsWith('/membership/payment') ||
        location.pathname.startsWith('/payment-');

    if (isExcluded) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            {children}
            <Footer />
            <CookieConsent />
            <PublicChatbot />
        </>
    );
};

export default Layout;
