import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { notifyMember } from '../utils/notify';

interface ChatThread {
    id: string;
    uid: string;
    topic?: string;
    status?: 'open' | 'closed';
    memberName?: string;
    memberEmail?: string;
    lastMessage?: string;
    lastMessageAt?: any;
    lastSenderRole?: 'member' | 'admin';
    unreadByAdmin?: boolean;
}

interface ChatMessage {
    id: string;
    senderRole: 'member' | 'admin';
    senderName: string;
    text: string;
    createdAt?: any;
}

interface MemberGroup {
    uid: string;
    memberName: string;
    memberEmail?: string;
    threads: ChatThread[];
    unreadCount: number;
}

const InboxManager: React.FC = () => {
    const { user } = useAuth();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [expandedUids, setExpandedUids] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatThread)));
        });
        return () => unsub();
    }, []);

    // Group threads by member — most-recently-active member group first,
    // preserving the already-sorted (by lastMessageAt desc) order of threads.
    const groups = useMemo<MemberGroup[]>(() => {
        const map = new Map<string, MemberGroup>();
        threads.forEach(t => {
            if (!map.has(t.uid)) {
                map.set(t.uid, { uid: t.uid, memberName: t.memberName || t.memberEmail || 'Member', memberEmail: t.memberEmail, threads: [], unreadCount: 0 });
            }
            const g = map.get(t.uid)!;
            g.threads.push(t);
            if (t.unreadByAdmin) g.unreadCount++;
        });
        return Array.from(map.values());
    }, [threads]);

    // Default: expand the first (most recent) group only.
    useEffect(() => {
        if (groups.length > 0 && expandedUids.size === 0) {
            setExpandedUids(new Set([groups[0].uid]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups.length]);

    const toggleGroup = (uid: string) => {
        setExpandedUids(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid); else next.add(uid);
            return next;
        });
    };

    useEffect(() => {
        if (!activeThreadId) { setMessages([]); return; }
        const q = query(collection(db, 'chats', activeThreadId, 'messages'), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
        });
        return () => unsub();
    }, [activeThreadId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const openThread = (thread: ChatThread) => {
        setActiveThreadId(thread.id);
        if (thread.unreadByAdmin) {
            updateDoc(doc(db, 'chats', thread.id), { unreadByAdmin: false }).catch(() => {});
        }
    };

    const handleSend = async () => {
        if (!draft.trim() || !activeThreadId || sending) return;
        setSending(true);
        const text = draft.trim();
        setDraft('');
        try {
            await addDoc(collection(db, 'chats', activeThreadId, 'messages'), {
                senderRole: 'admin',
                senderName: user?.email || 'PAHA Support',
                text,
                createdAt: serverTimestamp(),
            });
            const wasClosed = activeThread?.status === 'closed';
            await updateDoc(doc(db, 'chats', activeThreadId), {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                lastSenderRole: 'admin',
                unreadByMember: true,
                unreadByAdmin: false,
                ...(wasClosed ? { status: 'open' } : {}),
            });
            // Replying to a closed thread reopens it as the member's active
            // conversation again, so their chat widget continues here instead
            // of silently starting a stray duplicate topic.
            if (wasClosed && activeThread) {
                await updateDoc(doc(db, 'users', activeThread.uid), { activeChatThreadId: activeThreadId }).catch(() => {});
            }
            // activeThreadId's parent doc uid is always the member's own uid
            if (activeThread) {
                await notifyMember(activeThread.uid, {
                    type: 'admin_message',
                    title: 'New Message from PAHA Support',
                    body: text,
                    link: 'inbox',
                });
            }
        } catch (err) {
            console.error('[InboxManager] Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    // Closing ends the conversation topic — the member's next chat message
    // will automatically start a fresh topic entry in the inbox.
    const handleCloseThread = async (thread: ChatThread) => {
        if (!window.confirm('Close this conversation? The member\'s next message will start a new topic.')) return;
        try {
            await updateDoc(doc(db, 'chats', thread.id), { status: 'closed' });
            const userSnap = await getDoc(doc(db, 'users', thread.uid));
            if (userSnap.data()?.activeChatThreadId === thread.id) {
                await updateDoc(doc(db, 'users', thread.uid), { activeChatThreadId: null });
            }
        } catch (err) {
            console.error('[InboxManager] Failed to close thread:', err);
        }
    };

    // Admin-only: permanently remove a conversation topic and all its messages.
    const handleDeleteThread = async (thread: ChatThread, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Delete this conversation permanently? This cannot be undone.')) return;
        try {
            const msgsSnap = await getDocs(collection(db, 'chats', thread.id, 'messages'));
            await Promise.all(msgsSnap.docs.map(d => deleteDoc(doc(db, 'chats', thread.id, 'messages', d.id))));
            await deleteDoc(doc(db, 'chats', thread.id));
            const userSnap = await getDoc(doc(db, 'users', thread.uid));
            if (userSnap.data()?.activeChatThreadId === thread.id) {
                await updateDoc(doc(db, 'users', thread.uid), { activeChatThreadId: null });
            }
            if (activeThreadId === thread.id) {
                setActiveThreadId(null);
            }
        } catch (err) {
            console.error('[InboxManager] Failed to delete thread:', err);
        }
    };

    const activeThread = threads.find(t => t.id === activeThreadId) || null;

    const formatTime = (ts: any) => {
        const d = ts?.toDate?.();
        if (!d) return '';
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="h-full flex gap-4 pb-8">
            {/* Grouped thread list */}
            <div className="w-full max-w-xs shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Member Inbox</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{groups.length} member{groups.length !== 1 ? 's' : ''} • {threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {groups.length === 0 ? (
                        <div className="p-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-white/10 mb-2 block">forum</span>
                            <p className="text-xs text-slate-400 font-semibold">No conversations yet.</p>
                        </div>
                    ) : (
                        groups.map(group => {
                            const isExpanded = expandedUids.has(group.uid);
                            return (
                                <div key={group.uid} className="border-b border-slate-50 dark:border-white/5">
                                    <button
                                        onClick={() => toggleGroup(group.uid)}
                                        className="w-full text-left px-5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`material-symbols-outlined text-base text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{group.memberName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[9px] font-bold text-slate-400">{group.threads.length}</span>
                                            {group.unreadCount > 0 && <span className="size-2 rounded-full bg-rose-500"></span>}
                                        </div>
                                    </button>
                                    {isExpanded && group.threads.map(thread => (
                                        <div
                                            key={thread.id}
                                            className={`group relative pl-9 pr-3 py-2.5 border-t border-slate-50 dark:border-white/5 transition-colors ${activeThreadId === thread.id ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                        >
                                            <button onClick={() => openThread(thread)} className="w-full text-left pr-7">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate flex-1">{thread.topic || 'Conversation'}</span>
                                                    {thread.unreadByAdmin && <span className="size-1.5 rounded-full bg-rose-500 shrink-0"></span>}
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                    {thread.lastSenderRole === 'admin' ? 'You: ' : ''}{thread.lastMessage || 'No messages yet'}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${thread.status === 'closed' ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {thread.status === 'closed' ? 'Closed' : 'Open'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">{formatTime(thread.lastMessageAt)}</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteThread(thread, e)}
                                                className="absolute top-2.5 right-2 p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete conversation"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Active thread */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                {!activeThread ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                        <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-white/10 mb-3">chat</span>
                        <p className="text-sm text-slate-400 font-semibold">Select a conversation to view messages.</p>
                    </div>
                ) : (
                    <>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">person</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-black text-sm text-slate-900 dark:text-white truncate">{activeThread.memberName || 'Member'}</div>
                                <div className="text-[10px] text-slate-400 truncate">{activeThread.topic || activeThread.memberEmail}</div>
                            </div>
                            {activeThread.status !== 'closed' && (
                                <button
                                    onClick={() => handleCloseThread(activeThread)}
                                    className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 bg-slate-100 dark:bg-white/5 rounded-xl transition-all shrink-0"
                                >
                                    Close
                                </button>
                            )}
                            <button
                                onClick={(e) => handleDeleteThread(activeThread, e)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shrink-0"
                                title="Delete conversation"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                        {activeThread.status === 'closed' && (
                            <div className="px-5 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-500/10">
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">This conversation is closed. Sending a reply will reopen it.</p>
                            </div>
                        )}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50 dark:bg-slate-900/30">
                            {messages.map(m => (
                                <div key={m.id} className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                                        m.senderRole === 'admin'
                                            ? 'bg-primary text-white rounded-br-md'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 rounded-bl-md'
                                    }`}>
                                        {m.text}
                                        <div className={`text-[9px] mt-1 ${m.senderRole === 'admin' ? 'text-white/60' : 'text-slate-400'}`}>{formatTime(m.createdAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                            <input
                                type="text"
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder="Reply to member..."
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!draft.trim() || sending}
                                className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0"
                            >
                                <span className="material-symbols-outlined text-lg">send</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default InboxManager;
