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
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed.includes('invalid/')) return '';
    
    // Check if it is a Google Drive/Docs URL
    if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
        const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileDMatch && fileDMatch[1]) {
            return `https://drive.google.com/file/d/${fileDMatch[1]}/preview`;
        }
        const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
        }
        const docDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (docDMatch && docDMatch[1]) {
            if (trimmed.includes('/document/')) return `https://docs.google.com/document/d/${docDMatch[1]}/preview`;
            if (trimmed.includes('/spreadsheets/')) return `https://docs.google.com/spreadsheets/d/${docDMatch[1]}/preview`;
            if (trimmed.includes('/presentation/')) return `https://docs.google.com/presentation/d/${docDMatch[1]}/preview`;
        }
    }

    // Check if it's a PDF or Firebase Storage document URL (not an image)
    const isImage = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(trimmed) || trimmed.startsWith('data:image/');
    if (!isImage && (trimmed.includes('.pdf') || trimmed.includes('firebasestorage.googleapis.com'))) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
    }

    return trimmed;
};
