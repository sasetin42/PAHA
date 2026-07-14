import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface AppearanceSettings {
    logoUrl: string;
    headerLogoUrl?: string;
    footerLogoUrl?: string;
    sidebarCollapsedLogoUrl?: string;
    sidebarExpandedLogoUrl?: string;
    loadingLogoUrl?: string;
    faviconUrl: string;
    appName?: string;
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<AppearanceSettings>(() => {
        try {
            const cached = localStorage.getItem('paha_appearance_settings');
            if (cached) {
                const settings = JSON.parse(cached);
                return {
                    logoUrl: settings.logoUrl || '/paha-logo.png',
                    headerLogoUrl: settings.headerLogoUrl || settings.logoUrl || '/paha-logo.png',
                    footerLogoUrl: settings.footerLogoUrl || settings.logoUrl || '/paha-logo.png',
                    sidebarCollapsedLogoUrl: settings.sidebarCollapsedLogoUrl || settings.logoUrl || '/paha-logo.png',
                    sidebarExpandedLogoUrl: settings.sidebarExpandedLogoUrl || settings.logoUrl || '/paha-logo.png',
                    loadingLogoUrl: settings.loadingLogoUrl || settings.logoUrl || '/paha-logo.png',
                    faviconUrl: settings.faviconUrl || '/paha-logo.png',
                    appName: settings.appName || 'PAHA'
                };
            }
        } catch (_) {}
        return {
            logoUrl: '/paha-logo.png',
            headerLogoUrl: '/paha-logo.png',
            footerLogoUrl: '/paha-logo.png',
            sidebarCollapsedLogoUrl: '/paha-logo.png',
            sidebarExpandedLogoUrl: '/paha-logo.png',
            loadingLogoUrl: '/paha-logo.png',
            faviconUrl: '/paha-logo.png',
            appName: 'PAHA'
        };
    });

    useEffect(() => {
        const updateFavicon = (url: string) => {
            const iconLinks = document.querySelectorAll("link[rel*='icon']");
            if (iconLinks.length > 0) {
                iconLinks.forEach((link: any) => {
                    link.href = url;
                });
            } else {
                const link = document.createElement('link');
                link.type = 'image/png';
                link.rel = 'shortcut icon';
                link.href = url;
                document.head.appendChild(link);
            }
        };

        const docRef = doc(db, 'systemSettings', 'appearance');
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const settings = {
                    logoUrl: data.logoUrl || '/paha-logo.png',
                    headerLogoUrl: data.headerLogoUrl || data.logoUrl || '/paha-logo.png',
                    footerLogoUrl: data.footerLogoUrl || data.logoUrl || '/paha-logo.png',
                    sidebarCollapsedLogoUrl: data.sidebarCollapsedLogoUrl || data.logoUrl || '/paha-logo.png',
                    sidebarExpandedLogoUrl: data.sidebarExpandedLogoUrl || data.logoUrl || '/paha-logo.png',
                    loadingLogoUrl: data.loadingLogoUrl || data.logoUrl || '/paha-logo.png',
                    faviconUrl: data.faviconUrl || '/paha-logo.png',
                    appName: data.appName || 'PAHA'
                };
                setAppearance(settings);
                try {
                    localStorage.setItem('paha_appearance_settings', JSON.stringify(settings));
                } catch (_) {}

                updateFavicon(settings.faviconUrl);
            }
        }, (err) => {
            console.error('[useAppearance] error fetching appearance settings:', err);
        });

        return unsubscribe;
    }, []);

    return appearance;
}
