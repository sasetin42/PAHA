export const getSubdomain = (): 'admin' | 'member' | null => {
    const parts = window.location.hostname.split('.');
    if (parts[0] === 'admin') return 'admin';
    if (parts[0] === 'member') return 'member';
    return null;
};

const getBaseHost = () => window.location.hostname.replace(/^(admin|member)\./, '');
const getOriginParts = () => {
    const { protocol, port } = window.location;
    return `${protocol}//${getBaseHost()}${port ? `:${port}` : ''}`;
};

export const getPortalUrl = (portal: 'admin' | 'member', path = '/') =>
    `${window.location.protocol}//${portal}.${getBaseHost()}${window.location.port ? `:${window.location.port}` : ''}${path}`;

export const getMainSiteUrl = (path = '/') => `${getOriginParts()}${path}`;

export const getEmbeddableUrl = (url: string): string => {
    if (!url) return '';
    
    // Check if it is a Google Drive/Docs URL
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        // Handle standard file/d/... format
        const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileDMatch && fileDMatch[1]) {
            return `https://drive.google.com/file/d/${fileDMatch[1]}/preview`;
        }
        
        // Handle open?id=... format
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
        }

        // Handle docs/d/... format (Google Docs, Sheets, Slides)
        const docDMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (docDMatch && docDMatch[1]) {
            if (url.includes('/document/')) {
                return `https://docs.google.com/document/d/${docDMatch[1]}/preview`;
            }
            if (url.includes('/spreadsheets/')) {
                return `https://docs.google.com/spreadsheets/d/${docDMatch[1]}/preview`;
            }
            if (url.includes('/presentation/')) {
                return `https://docs.google.com/presentation/d/${docDMatch[1]}/preview`;
            }
        }
    }
    return url;
};
