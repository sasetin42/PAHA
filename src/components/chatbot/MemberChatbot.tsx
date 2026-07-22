import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

interface Message {
 id: string;
 text: string;
 sender: 'user' | 'bot' | 'representative';
 timestamp: Date;
 read?: boolean;
}

interface KnowledgeBase {
  [key: string]: any;
}

const MemberChatbot: React.FC = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'bot' | 'representative'>('bot');
  const [messages, setMessages] = useState<Message[]>([]);

  // Reset messages when chat is closed or reopened
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
    }
  }, [isOpen]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [representativeTyping, setRepresentativeTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load knowledge base
  useEffect(() => {
    fetch('/knowledge-base.json')
      .then(res => res.json())
      .then(data => setKnowledgeBase(data))
      .catch(err => console.error('Failed to load knowledge base:', err));
  }, []);

  // Listen to chat thread messages
  useEffect(() => {
    if (!chatThreadId || chatMode === 'bot') return;

    const q = query(
      collection(db, 'chats', chatThreadId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().createdAt?.toDate() || new Date(),
        sender: d.data().senderRole === 'admin' ? 'representative' : 'user'
      } as Message));
  setMessages(msgs);

  // Mark messages as read
  snap.docs.forEach(docSnap => {
        if (docSnap.data().senderRole === 'admin' && !docSnap.data().readByMember) {
          updateDoc(doc(db, 'chats', chatThreadId, 'messages', docSnap.id), {
            readByMember: true
          }).catch(() => {});
        }
      });
    }, (err) => {
      console.error('[MemberChatbot] Messages error:', err);
    });

    return () => unsubscribe();
  }, [chatThreadId, chatMode]);

  // Listen for representative typing indicator
  useEffect(() => {
    if (!chatThreadId || chatMode === 'bot') return;

    const chatRef = doc(db, 'chats', chatThreadId);
    const unsubscribe = onSnapshot(chatRef, (snap) => {
      const data = snap.data();
      setRepresentativeTyping(!!data?.representativeTyping);
    }, (err) => {
      console.error('[MemberChatbot] Chat snapshot error:', err);
    });

    return () => unsubscribe();
  }, [chatThreadId, chatMode]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting for bot mode
  useEffect(() => {
    if (knowledgeBase && chatMode === 'bot' && isOpen && messages.length === 0) {
      setTimeout(() => {
        addBotMessage(
          `Hello ${profile?.ownerName || profile?.displayName || 'Member'}! 👋\n\n` +
          `I'm your PAHA Virtual Assistant. I can help you with:\n\n` +
          `• Membership status and documents\n` +
          `• Accreditation progress\n` +
          `• Event registrations\n` +
          `• General PAHA information\n\n` +
          `Or switch to "Chat with Representative" to message our support team.`
        );
      }, 500);
    }
  }, [knowledgeBase, chatMode, isOpen]);

  const addUserMessage = (text: string, sender: 'user' | 'bot' | 'representative' = 'user') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addBotMessage = (text: string) => {
    const newMessage: Message = {
      id: (Date.now() + 1).toString(),
      text,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendToRepresentative = async (text: string) => {
    if (!user || !text.trim()) return;

    try {
      // Create or get chat thread
      let threadId = chatThreadId;
      
      if (!threadId) {
        const threadRef = await addDoc(collection(db, 'chats'), {
          uid: user.uid,
          memberName: profile?.ownerName || profile?.displayName || user.email?.split('@')[0] || 'Member',
          memberEmail: user.email || '',
          clinicName: profile?.clinicName || '',
          createdAt: serverTimestamp(),
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
          lastSenderRole: 'member',
          unreadByAdmin: true
        });
        threadId = threadRef.id;
        setChatThreadId(threadId);
        setHasActiveChat(true);
      }

      // Add message
      await addDoc(collection(db, 'chats', threadId, 'messages'), {
        senderRole: 'member',
        senderName: profile?.ownerName || user.email?.split('@')[0] || 'Member',
        text: text.trim(),
        createdAt: serverTimestamp(),
        readByAdmin: false
      });

      // Update thread
      await updateDoc(doc(db, 'chats', threadId), {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        lastSenderRole: 'member',
        unreadByAdmin: true
      });

    } catch (err) {
      console.error('Failed to send message:', err);
      addBotMessage('Sorry, there was an error sending your message. Please try again.');
    }
  };

  const findBestMatch = (query: string): string => {
    if (!knowledgeBase) return "I'm still loading my knowledge base. Please try again in a moment.";

    const q = query.toLowerCase();

    // Check membership status
    if (q.includes('my membership') || q.includes('membership status') || q.includes('my application')) {
      const status = profile?.membershipStatus || 'pending';
      const type = profile?.membershipType || profile?.type || 'Not specified';
      
      if (status === 'active') {
        return `**Your Membership Status**: ✅ Active\n\n` +
          `• Type: ${type}\n` +
          `• You have full access to all member benefits\n` +
          `• Accreditation system is available\n` +
          `• Event member pricing is active\n\n` +
          `Need to renew? Visit the Membership tab in your dashboard.`;
      } else if (status === 'pending') {
        return `**Your Membership Status**: ⏳ Pending\n\n` +
          `Your application is under review by the PAHA board.\n\n` +
          `Typical processing time: 2-4 weeks\n\n` +
          `You'll receive a notification once your application is approved.`;
      } else {
        return `**Your Membership Status**: ${status}\n\n` +
          `Please complete your membership application or contact support for assistance.`;
      }
    }

    // Check accreditation status
    if (q.includes('my accreditation') || q.includes('accreditation status') || q.includes('my progress')) {
      return `To check your accreditation progress:\n\n` +
        `1. Go to your Member Dashboard\n` +
        `2. Click the "Accreditation" tab\n` +
        `3. View your current stage and requirements\n\n` +
        `The pipeline shows real-time status of your application through all 11 stages.\n\n` +
        `Need help? Switch to "Chat with Representative" mode.`;
    }

    // Payment queries
    if (q.includes('payment') || q.includes('pay') || q.includes('fee')) {
      if (q.includes('membership')) {
        return `**Your Membership Payment**:\n\n` +
          `• First year fee depends on membership type\n` +
          `• Renewal: ₱2,000/year\n\n` +
          `To pay:\n` +
          `1. Go to Membership tab\n` +
          `2. Click "Pay Now" or "Renew"\n` +
          `3. Complete payment via bank transfer\n\n` +
          `Payment status updates within 24-48 hours after admin verification.`;
      }
      if (q.includes('accreditation')) {
        return `**Accreditation Payment**:\n\n` +
          `• Total: ₱17,500 (₱15,000 + ₱2,500 processing)\n` +
          `• Paid after all categories are approved\n` +
          `• Upload proof of payment in Accreditation tab\n\n` +
          `Payment is the final stage before receiving your accreditation certificate.`;
      }
    }

    // Document upload
    if (q.includes('document') || q.includes('upload') || q.includes('file')) {
      return `**Document Upload Guide**:\n\n` +
        `📄 **Max file size**: 5MB (documents), 25MB (video)\n` +
        `📄 **Accepted formats**: PDF, JPG, PNG, MP4\n\n` +
        `Upload locations:\n` +
        `• Membership docs: Membership tab → Documents section\n` +
        `• Accreditation docs: Accreditation tab → Compliance stage\n` +
        `• Payment proof: Payment page or Accreditation tab\n\n` +
        `Troubleshooting: Compress large files, check format, try different browser.`;
    }

    // Event registration
    if (q.includes('event') || q.includes('register') || q.includes('convention')) {
      return `**Your Event Registrations**:\n\n` +
        `View all your registrations:\n` +
        `1. Member Dashboard → Events tab\n` +
        `2. See upcoming, past, and registered events\n\n` +
        `To register for new events:\n` +
        `1. Visit /events\n` +
        `2. Click event → "Secure Your Spot"\n` +
        `3. Complete 3-step registration\n\n` +
        `Member discounts are automatically applied.`;
    }

    // Technical support
    if (q.includes('problem') || q.includes('issue') || q.includes('error') || q.includes('not working') || q.includes('help')) {
      return `**Technical Support**:\n\n` +
        `Common solutions:\n` +
        `• Refresh the page (Ctrl+R / Cmd+R)\n` +
        `• Clear browser cache\n` +
        `• Try incognito/private mode\n` +
        `• Check internet connection\n\n` +
        `Still having issues? Switch to "Chat with Representative" for live support.\n\n` +
        `Or email: paha_members@yahoo.com`;
    }

    // Account/Profile
    if (q.includes('profile') || q.includes('account') || q.includes('update') || q.includes('edit')) {
      return `**Manage Your Profile**:\n\n` +
        `Update your information:\n` +
        `1. Member Dashboard → Profile tab\n` +
        `2. Edit clinic details, contact info\n` +
        `3. Manage representatives (add/edit/delete)\n` +
        `4. Upload profile photo\n\n` +
        `Changes are saved automatically.`;
    }

    // Notification
    if (q.includes('notification') || q.includes('message') || q.includes('alert')) {
      return `**Your Notifications**:\n\n` +
        `View notifications:\n` +
        `• Click bell icon (top navigation)\n` +
        `• Or go to Notifications tab\n\n` +
        `Notification types:\n` +
        `• Membership updates\n` +
        `• Accreditation status changes\n` +
        `• Event reminders\n` +
        `• Payment confirmations\n\n` +
        `Click any notification to navigate to relevant section.`;
    }

    // Representative chat handoff
    if (q.includes('representative') || q.includes('human') || q.includes('person') || q.includes('support') || q.includes('agent')) {
      return `I can connect you with a PAHA representative.\n\n` +
        `Click the **"Chat with Representative"** button above to start a live chat.\n\n` +
        `Response time: Usually within 24 hours during office hours (Mon-Fri, 8AM-5PM).`;
    }

    // Fallback with personalized touch
    return `I want to help you with that! Here's what I found:\n\n` +
      `Based on your question, you might want to:\n\n` +
      `• Check your **Membership** tab for membership-related queries\n` +
      `• Visit **Accreditation** tab for accreditation progress\n` +
      `• Browse **Events** for upcoming activities\n\n` +
      `Or switch to **"Chat with Representative"** for personalized assistance.\n\n` +
      `You can also email paha_members@yahoo.com or call +63 2 8955 1234.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    addUserMessage(userMessage, 'user');
    setInput('');

    if (chatMode === 'bot') {
      setIsTyping(true);
      setTimeout(() => {
        const response = findBestMatch(userMessage);
        addBotMessage(response);
        setIsTyping(false);
      }, 800 + Math.random() * 700);
    } else {
      // Representative mode
      await sendToRepresentative(userMessage);
      addUserMessage('Your message has been sent. Our team will respond within 24 hours.', 'bot');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]); // Clear chat on close
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = chatMode === 'bot' ? [
    "My membership status?",
    "Accreditation progress?",
    "How to upload documents?",
    "Event registrations?"
  ] : [
    "I need technical help",
    "Payment issue",
    "Document question",
    "General inquiry"
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[999] size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative"
        aria-label="Open PAHA Support Chat"
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-2xl">close</span>
        ) : (
          <>
            <span className="material-symbols-outlined text-2xl">
              {chatMode === 'bot' ? 'smart_toy' : 'support_agent'}
            </span>
            {hasActiveChat && chatMode === 'representative' && messages.some(m => m.sender === 'representative' && !m.read) && (
              <span className="absolute top-0.5 right-0.5 size-3.5 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div 
          ref={chatContainerRef}
          className="fixed bottom-24 right-6 z-[999] w-[90vw] max-w-md h-[600px] max-h-[calc(100vh-180px)] bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-primary text-white flex items-center gap-3 shrink-0">
            <div className="size-9 rounded-full bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">
                {chatMode === 'bot' ? 'smart_toy' : 'support_agent'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm leading-tight">
                {chatMode === 'bot' ? 'PAHA Virtual Assistant' : 'Chat with Representative'}
              </div>
              <div className="text-[10px] text-white/70 uppercase tracking-wider">
                {chatMode === 'bot' 
                  ? 'AI-powered assistance' 
                  : representativeTyping 
                    ? 'Representative is typing...' 
                    : 'Response within 24 hours'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Mode Switcher */}
              <button
                onClick={() => setChatMode(chatMode === 'bot' ? 'representative' : 'bot')}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-wider"
                title={chatMode === 'bot' ? 'Switch to representative chat' : 'Switch to bot'}
              >
                {chatMode === 'bot' ? 'human' : 'smart_toy'}
              </button>
<button
  onClick={handleClose}
  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0A0F1A]">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : msg.sender === 'representative'
                        ? 'bg-emerald-500 text-white rounded-bl-md'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className={`text-[9px] mt-1 flex items-center gap-1 ${
                    msg.sender === 'user' ? 'text-white/70' : 
                    msg.sender === 'representative' ? 'text-white/70' : 'text-slate-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.sender === 'user' && msg.read && (
                      <span className="material-symbols-outlined text-[10px]">done_all</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
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
            {representativeTyping && (
              <div className="flex justify-start">
                <div className="bg-emerald-500 px-3.5 py-2.5 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="size-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="size-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="size-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length < 3 && (
            <div className="px-4 py-2 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-white/5">
              <div className="text-[10px] text-slate-400 mb-2">
                {chatMode === 'bot' ? 'Quick questions:' : 'Common topics:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      setTimeout(handleSend, 100);
                    }}
                    className="px-3 py-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0F172A]">
            <div className="flex items-center gap-2">
              <input
                id="mbot-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={chatMode === 'bot' ? "Ask me anything..." : "Type your message..."}
                className="flex-1 px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                disabled={isTyping || (chatMode === 'representative' && !user)}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping || (chatMode === 'representative' && !user)}
                className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 text-center">
              {chatMode === 'bot' 
                ? 'AI assistant. For urgent matters, switch to representative chat.' 
                : 'PAHA team responds within 24 hours during office hours.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemberChatbot;