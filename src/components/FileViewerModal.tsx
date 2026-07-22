import React from 'react';
import { getEmbeddableUrl } from '../utils/portalUrl';

export interface ViewerFile {
    url: string;
    name: string;
}

interface Props {
    file: ViewerFile | null;
    onClose: () => void;
}

/** Full-screen embedded viewer for an uploaded file — PDFs/images/videos all
 *  render inline instead of forcing a new browser tab. */
const FileViewerModal: React.FC<Props> = ({ file, onClose }) => {
    if (!file) return null;

    const isImage = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(file.url) || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name) || file.url.startsWith('data:image/');
    const isVideo = /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(file.url) || /\.(mp4|mov|webm)$/i.test(file.name) || file.url.startsWith('data:video/');

    return (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/10 shrink-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate pr-4">{file.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                        <a href={file.url} download className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300" title="Download">
                            <span className="material-symbols-outlined text-lg">download</span>
                        </a>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-300 hover:text-red-600" title="Close">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-black overflow-auto flex items-center justify-center">
                    {isImage ? (
                        <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                    ) : isVideo ? (
                        <video src={file.url} controls className="w-full h-full" />
                    ) : (
                        <iframe src={getEmbeddableUrl(file.url)} title={file.name} className="w-full h-full border-0" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileViewerModal;
