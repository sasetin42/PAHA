"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'representative';
  timestamp: Date;
  read?: boolean;
}

interface ChatThread {
  id: string;
  topic?: string;
  status?: 'open' | 'closed';
  lastMessage: string;
  lastMessageAt: any;
  unreadByMember: boolean;
  messageCount: number;
}

const Inbox: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Load every conversation topic this member has ever had — each one is
  // saved here permanently so past conversations stay easy to find, even
  // after admin closes them and a new topic starts in the live chat widget.
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'chats'),
      where('uid', '==', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const threads = snap.docs.map(doc => {
        const threadData = doc.data();
        return {
          id: doc.id,
          topic: threadData.topic,
          status: threadData.status || 'open',
          lastMessage: threadData.lastMessage,
          lastMessageAt: threadData.lastMessageAt,
          unreadByMember: threadData.unreadByMember,
          messageCount: threadData.messageCount || 0
        } as ChatThread;
      });
      setThreads(threads);
    }, (err) => {
      console.error('[Inbox] Threads error:', err);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Load messages for selected thread
  useEffect(() => {
    if (!selectedThreadId) return;
    const q = query(
      collection(db, 'chats', selectedThreadId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text,
        sender: (doc.data().senderRole === 'admin' ? 'representative' : 'user') as 'user' | 'representative',
        timestamp: doc.data().createdAt?.toDate() || new Date(),
        read: doc.data().readByMember
      }));
      setMessages(msgs);

      // Mark messages as read
      snap.docs.forEach(docSnap => {
        if (docSnap.data().senderRole === 'admin' && !docSnap.data().readByMember) {
          updateDoc(doc(db, 'chats', selectedThreadId, 'messages', docSnap.id), {
            readByMember: true
          }).catch(() => {});
        }
      });
    }, (err) => {
      console.error('[Inbox] Messages error:', err);
    });
    return () => unsubscribe();
  }, [selectedThreadId]);

  // Grouped, collapsible history — same visual pattern as the admin inbox:
  // an "Active" section for any open conversation, and a "Past Conversations"
  // history section for everything admin has closed.
  const [expandedGroups, setExpandedGroups] = useState<Set<'open' | 'closed'>>(new Set(['open', 'closed']));
  const toggleGroup = (key: 'open' | 'closed') => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const groupedThreads = useMemo(() => {
    const open = threads.filter(t => t.status !== 'closed');
    const closed = threads.filter(t => t.status === 'closed');
    return [
      { key: 'open' as const, label: 'Active Conversation', threads: open },
      { key: 'closed' as const, label: 'Past Conversations', threads: closed },
    ].filter(g => g.threads.length > 0);
  }, [threads]);

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    // Mark thread as read
    updateDoc(doc(db, 'chats', threadId), {
      unreadByMember: false
    }).catch(() => {});
  };

  const formatTime = (timestamp: any) => {
    const date = timestamp?.toDate?.() || timestamp;
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

  return (
    <div className="h-full flex gap-4">
      {/* Thread list */}
      <div className="w-full max-w-xs shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Inbox</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-white/10 mb-2 block">inbox</span>
              <p className="text-xs text-slate-400 font-semibold">No conversations yet.</p>
            </div>
          ) : (
            groupedThreads.map(group => {
              const isExpanded = expandedGroups.has(group.key);
              const unreadCount = group.threads.filter(t => t.unreadByMember).length;
              return (
                <div key={group.key} className="border-b border-slate-50 dark:border-white/5">
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full text-left px-5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`material-symbols-outlined text-base text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-bold text-slate-400">{group.threads.length}</span>
                      {unreadCount > 0 && <span className="size-2 rounded-full bg-rose-500"></span>}
                    </div>
                  </button>
                  {isExpanded && group.threads.map(thread => (
                    <button
                      key={thread.id}
                      onClick={() => openThread(thread.id)}
                      className={`relative w-full text-left pl-9 pr-5 py-3 border-t border-slate-50 dark:border-white/5 transition-colors ${selectedThreadId === thread.id ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{thread.topic || 'Conversation'}</span>
                        {thread.unreadByMember && <span className="size-2 rounded-full bg-rose-500 shrink-0"></span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {thread.lastMessage}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatTime(thread.lastMessageAt)} • {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                      </p>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
        {!selectedThreadId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-white/10 mb-3">chat</span>
            <p className="text-sm text-slate-400 font-semibold">Select a conversation to view messages.</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">support_agent</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-sm text-slate-900 dark:text-white truncate">{selectedThread?.topic || 'PAHA Support Team'}</div>
                <div className="text-[10px] text-slate-400">
                  {selectedThread?.status === 'closed' ? 'This conversation has been closed' : 'Response within 24 hours'}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50 dark:bg-slate-900/30">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 rounded-bl-md'}`}>
                    {msg.text}
                    <div className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 text-center">
              <p className="text-[10px] text-slate-400">
                To reply, use the chat button in the bottom-right corner.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Inbox;
