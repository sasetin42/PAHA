"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, increment, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
}

const ChatWidget: React.FC = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  // The active conversation "topic" thread — null means there's no open
  // conversation yet (either the member has never messaged, or admin closed
  // the last one), so the next message sent will start a brand new topic.
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track which thread is currently active — stored on the member's own user
  // doc so no query (and no composite index) is needed just to find it.
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setActiveThreadId(snap.data()?.activeChatThreadId || null);
    }, (err) => {
      console.error('[ChatWidget] User doc error:', err);
    });
    return () => unsub();
  }, [user?.uid]);

  // Watch the active thread doc (even while closed) so the floating button
  // can show an unread dot when admin replies, and to clear it once opened.
  useEffect(() => {
    if (!activeThreadId) { setHasUnread(false); return; }
    const unsub = onSnapshot(doc(db, 'chats', activeThreadId), (snap) => {
      setHasUnread(!!snap.data()?.unreadByMember);
    }, (err) => {
      console.error('[ChatWidget] Chat doc error:', err);
    });
    return () => unsub();
  }, [activeThreadId]);

  useEffect(() => {
    if (isOpen && activeThreadId && hasUnread) {
      setDoc(doc(db, 'chats', activeThreadId), { unreadByMember: false }, { merge: true }).catch(() => {});
    }
  }, [isOpen, activeThreadId, hasUnread]);

  // Listen to messages for the current active thread only — closed/past
  // topics live in the member's Inbox tab, not mixed into this live chatbox.
  useEffect(() => {
    if (!activeThreadId) { setMessages([]); return; }
    const msgsQuery = query(collection(db, 'chats', activeThreadId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(msgsQuery, (snap) => {
      const msgs: Message[] = snap.docs.map(d => ({
        id: d.id,
        text: d.data().text,
        sender: (d.data().senderRole === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        timestamp: d.data().createdAt?.toDate() || new Date()
      }));
      setMessages(msgs);
    }, (err) => {
      console.error('[ChatWidget] Messages error:', err);
    });
    return () => unsub();
  }, [activeThreadId]);

  // Send message to Firestore
  const sendMessage = async () => {
    if (!input.trim() || isSending || !user) return;

    setIsSending(true);
    const userMessage = input.trim();
    const memberName = profile?.displayName || user.email?.split('@')[0] || 'Member';

    setInput('');

    try {
      let threadId = activeThreadId;
      if (!threadId) {
        // No open topic — start a brand new one.
        const threadRef = await addDoc(collection(db, 'chats'), {
          uid: user.uid,
          memberName,
          memberEmail: user.email || '',
          clinicName: profile?.clinicName || '',
          topic: userMessage.slice(0, 60),
          status: 'open',
          createdAt: serverTimestamp(),
          lastMessage: userMessage,
          lastMessageAt: serverTimestamp(),
          lastSenderRole: 'member',
          unreadByAdmin: true,
          messageCount: 1
        });
        threadId = threadRef.id;
        setActiveThreadId(threadId);
        await setDoc(doc(db, 'users', user.uid), { activeChatThreadId: threadId }, { merge: true });
      } else {
        await updateDoc(doc(db, 'chats', threadId), {
          lastMessage: userMessage,
          lastMessageAt: serverTimestamp(),
          lastSenderRole: 'member',
          unreadByAdmin: true,
          messageCount: increment(1)
        });
      }

      // Add message
      await addDoc(collection(db, 'chats', threadId, 'messages'), {
        senderRole: 'member',
        senderName: memberName,
        text: userMessage,
        createdAt: serverTimestamp(),
        readByAdmin: false
      });

      // Also create an admin notification so admin sees a new message alert
      await addDoc(collection(db, 'admin_notifications'), {
        uid: user.uid,
        type: 'member_message',
        title: `Message from ${memberName}`,
        body: userMessage,
        link: 'inbox',
        createdAt: serverTimestamp(),
        read: false
      });

    } catch (err) {
      console.error('Failed to send message:', err);

    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[998] size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        aria-label="Open PAHA Support Chat"
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-2xl">close</span>
        ) : (
          <span className="material-symbols-outlined text-2xl">chat</span>
        )}
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0F172A]" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[998] w-[90vw] max-w-sm h-[65vh] max-h-[520px] bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3.5 bg-primary text-white flex items-center gap-3 shrink-0 rounded-t-2xl">
            <div className="size-9 rounded-full bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">support_agent</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm leading-tight">PAHA Support</div>
              <div className="text-[10px] text-white/70 uppercase tracking-wider">Response within 24 hours</div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0A0F1A]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-white/10 mb-2">forum</span>
                <p className="text-xs text-slate-400 font-semibold">Send a message to start a new conversation.</p>
                <p className="text-[10px] text-slate-400 mt-1">Past conversations are saved in your Inbox tab.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 rounded-bl-md'}`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className={`text-[9px] mt-1 flex items-center gap-1 ${msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 px-3.5 py-2.5 rounded-2xl rounded-bl-md border border-slate-200 dark:border-white/5">
                  <div className="flex gap-1">
                    <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0F172A] rounded-b-2xl">
            <div className="flex items-center gap-2">
              <label htmlFor="chat-message-input" className="sr-only">Type your message</label>
              <input
                id="chat-message-input"
                name="chatMessageInput"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                aria-label="Type your message"
                className="flex-1 px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                disabled={isSending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isSending}
                className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 text-center">
              Message PAHA support directly
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
