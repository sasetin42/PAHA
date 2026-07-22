import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface KnowledgeBase {
  [key: string]: any;
}

const PublicChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load knowledge base on mount
  useEffect(() => {
    fetch('/knowledge-base.json')
      .then(res => res.json())
      .then(data => setKnowledgeBase(data))
      .catch(err => console.error('Failed to load knowledge base:', err));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (knowledgeBase && messages.length === 0) {
      setTimeout(() => {
        addBotMessage(
          "Hello! 👋 I'm the PAHA Virtual Assistant. I can help you with information about:\n\n• Membership application and requirements\n• Clinic accreditation process\n• Events and conventions\n• Contact information\n\nWhat would you like to know?"
        );
      }, 500);
    }
  }, [knowledgeBase]);

  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
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

  const findBestMatch = (query: string): string => {
    if (!knowledgeBase) return "I'm still loading my knowledge base. Please try again in a moment.";

    const q = query.toLowerCase();

    // Membership queries
    if (q.includes('membership')) {
      if (q.includes('type') || q.includes('kinds') || q.includes('categories')) {
        const types = knowledgeBase.membership.types;
        return `PAHA offers ${types.length} membership types:\n\n` + 
          types.map((t: any) => `• **${t.name}**: ${t.description}\n  First year: ₱${t.fees.firstYear.toLocaleString()}, Renewal: ₱${t.fees.renewal.toLocaleString()}`).join('\n\n') +
          `\n\nWhich type are you interested in?`;
      }
      if (q.includes('fee') || q.includes('cost') || q.includes('price') || q.includes('how much')) {
        return `**Membership Fees**:\n\n` +
          knowledgeBase.membership.types.map((t: any) => `• ${t.name}: ₱${t.fees.firstYear.toLocaleString()} (first year), ₱${t.fees.renewal.toLocaleString()} (renewal)`).join('\n') +
          `\n\nAll fees are in Philippine Pesos (PHP).`;
      }
      if (q.includes('requirement') || q.includes('needed') || q.includes('qualif')) {
        return `**Membership Requirements**:\n\n` +
          `All applicants must have:\n` +
          `• Valid PRC veterinary license\n` +
          `• DTI/SEC registered clinic\n` +
          `• Completed application form\n` +
          `• Government ID\n` +
          `• Clinic photos\n\n` +
          `Additional documents depend on your business structure (Sole Proprietorship, Partnership, or Teaching Hospital).`;
      }
      if (q.includes('apply') || q.includes('application') || q.includes('process') || q.includes('how to join')) {
        return `**Membership Application Process**:\n\n` +
          `1. **Check Qualifications** - Ensure you meet eligibility requirements\n` +
          `2. **Submit Application** - Complete online form at /membership/application\n` +
          `3. **Email Verification** - Verify your email via the link sent\n` +
          `4. **Pay Application Fee** - Settle ₱5,000 fee\n` +
          `5. **Admin Review** - Board reviews your application (2-4 weeks)\n` +
          `6. **Approval** - Receive notification and gain full access\n\n` +
          `Ready to apply? Visit: /membership/application`;
      }
      if (q.includes('benefit') || q.includes('why join') || q.includes('perks')) {
        const benefits = knowledgeBase.membership.overview.benefits;
        return `**PAHA Membership Benefits**:\n\n` +
          benefits.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
      }
      if (q.includes('renew') || q.includes('renewal') || q.includes('expire')) {
        return `**Membership Renewal**:\n\n` +
          `• Validity: 1 year from approval date\n` +
          `• Renewal fee: ₱2,000 (all types)\n` +
          `• Process: Login to dashboard → Membership tab → Renew\n` +
          `• Automatic reminders sent before expiry`;
      }
      if (q.includes('how long') || q.includes('time') || q.includes('duration')) {
        return `Membership approval typically takes **2-4 weeks** after complete application submission and document verification.`;
      }
    }

    // Accreditation queries
    if (q.includes('accredit')) {
      if (q.includes('what') || q.includes('definition') || q.includes('meaning')) {
        return `**PAHA Clinic Accreditation** is a formal recognition program that validates veterinary clinics against the 2026 PAHA Accreditation Standard. It demonstrates your clinic's commitment to excellence in veterinary care, facilities, personnel, and operational standards.\n\nValidity: **3 years** from approval date.`;
      }
      if (q.includes('stage') || q.includes('step') || q.includes('process') || q.includes('how')) {
        const stages = knowledgeBase.accreditation.stages;
        return `**Accreditation Process (11 Stages)**:\n\n` +
          stages.map((s: any) => `${s.stage}. **${s.name}** (${s.status})`).join('\n') +
          `\n\nYou must complete membership approval before starting accreditation.`;
      }
      if (q.includes('fee') || q.includes('cost') || q.includes('price') || q.includes('how much')) {
        const acc = knowledgeBase.accreditation;
        return `**Accreditation Fees**:\n\n` +
          `• Accreditation Fee: ₱${acc.fees.accreditationFee.toLocaleString()}\n` +
          `• Processing Fee: ₱${acc.fees.processingFee.toLocaleString()}\n` +
          `• **Total: ₱${acc.fees.total.toLocaleString()}**\n\n` +
          `Payment via bank transfer after all categories are approved.`;
      }
      if (q.includes('requirement') || q.includes('document') || q.includes('needed')) {
        return `**Accreditation Requirements** vary by category. Key sections include:\n\n` +
          `• Signages/Permits/Licenses (100% required)\n` +
          `• General Sanitary Conditions (80%)\n` +
          `• Personnel (100% - 2 vets, 1 receptionist, 2 aides)\n` +
          `• Reception Room (100%)\n` +
          `• Pharmacy Room (100% - compulsory)\n` +
          `• Examination Room (100%)\n` +
          `• Surgery Room (100%)\n` +
          `• Confinement Area (80%)\n` +
          `• Medical Records (80%)\n` +
          `• Diagnostic Imaging (80%)\n` +
          `• Laboratory (80%)\n\n` +
          `Document uploads: Max 5MB per file (PDF, JPG, PNG).`;
      }
      if (q.includes('valid') || q.includes('long') || q.includes('year')) {
        return `Accreditation is valid for **3 years** from the date of approval. You'll receive renewal notifications before expiry.`;
      }
      if (q.includes('fail') || q.includes('non-compliant') || q.includes('reject')) {
        return `If you fail a category:\n\n` +
          `1. You'll receive specific remarks for each non-compliant item\n` +
          `2. Fix the identified issues\n` +
          `3. Resubmit corrected documents\n` +
          `4. Admin re-reviews the category\n` +
          `5. Repeat until all categories pass\n\n` +
          `You can iterate as many times as needed until full compliance.`;
      }
    }

    // Event queries
    if (q.includes('event') || q.includes('seminar') || q.includes('workshop') || q.includes('convention') || q.includes('conference')) {
      if (q.includes('register') || q.includes('sign up') || q.includes('join')) {
        return `**Event Registration Process**:\n\n` +
          `1. Browse events at /events\n` +
          `2. Click event card for details\n` +
          `3. Click "Secure Your Spot"\n` +
          `4. Fill personal information\n` +
          `5. Fill professional details (PRC license, etc.)\n` +
          `6. Select payment method and complete payment\n\n` +
          `Payment methods: Credit Card, E-Wallet, Bank Transfer`;
      }
      if (q.includes('fee') || q.includes('cost') || q.includes('price')) {
        return `Event fees vary by event. **PAHA members receive discounted rates**. Check individual event pages for specific pricing. Some events offer early bird discounts and promo codes.`;
      }
      if (q.includes('cpd') || q.includes('ceu') || q.includes('unit')) {
        return `Most PAHA events are **PRC-accredited** for Continuing Professional Development (CPD) units. Check individual event details for specific CPD unit information. Certificates are distributed after event completion via email and member dashboard.`;
      }
      if (q.includes('type') || q.includes('kind') || q.includes('category')) {
        return `**PAHA Event Types**:\n\n` +
          `• **Workshops** - Hands-on technical training\n` +
          `• **Seminars** - Educational presentations\n` +
          `• **Conventions** - Large-scale gatherings\n` +
          `• **Conferences** - Professional meetings\n` +
          `• **Wetlabs** - Practical laboratory sessions\n` +
          `• **CPE Programs** - Continuing Professional Education`;
      }
    }

    // Contact queries
    if (q.includes('contact') || q.includes('reach') || q.includes('email') || q.includes('phone') || q.includes('address') || q.includes('location') || q.includes('where')) {
      const org = knowledgeBase.general.organization;
      return `**Contact PAHA**:\n\n` +
        `📍 **Office**: ${org.officeAddress}\n\n` +
        `📧 **Email**:\n` +
        `   • General: ${org.email.general}\n` +
        `   • Support: ${org.email.support}\n\n` +
        `📞 **Phone**: ${org.phone}\n\n` +
        `🕒 **Office Hours**: ${org.officeHours.weekdays}\n\n` +
        `You can also:\n` +
        `• Use the contact form at /contact\n` +
        `• Message us via Messenger (widget on bottom-right)\n` +
        `• Walk-in during office hours`;
    }

    if (q.includes('hour') || q.includes('open') || q.includes('close') || q.includes('time')) {
      return `**PAHA Office Hours**:\n\n` +
        `🕒 Monday - Friday: 8:00 AM - 5:00 PM (Philippine Standard Time)\n` +
        `❌ Closed on weekends and all Philippine holidays\n\n` +
        `For urgent matters outside office hours, send an email and we'll respond the next business day.`;
    }

    // Login/Account queries
    if (q.includes('login') || q.includes('sign in') || q.includes('account')) {
      if (q.includes('forgot') || q.includes('password') || q.includes('reset')) {
        return `**Password Reset**:\n\n` +
          `1. Go to /login or /admin/login\n` +
          `2. Click "Forgot password?"\n` +
          `3. Enter your registered email\n` +
          `4. Check inbox for reset link (check spam folder)\n` +
          `5. Click link and set new password\n\n` +
          `Password must be at least 6 characters.`;
      }
      if (q.includes('verify') || q.includes('verification') || q.includes('email')) {
        return `**Email Verification**:\n\n` +
          `After registration, you must verify your email before accessing the dashboard.\n\n` +
          `1. Check your inbox for verification email\n` +
          `2. Click the verification link\n` +
          `3. If not received, click "Resend Verification Email" on login page\n` +
          `4. Check spam/junk folder if not in inbox`;
      }
    }

    // File upload queries
    if (q.includes('file') || q.includes('upload') || q.includes('document') || q.includes('size') || q.includes('format')) {
      return `**File Upload Requirements**:\n\n` +
        `📄 **Documents**: Max 5MB (PDF, JPG, PNG)\n` +
        `🎥 **Walkthrough Video**: Max 25MB, 1 minute (MP4)\n` +
        `📸 **Photos**: Max 5MB (JPG, PNG)\n\n` +
        `If upload fails, check file size and format. Compress large files if needed.`;
    }

    // Default response for unmatched queries
    const fallbackResponses = [
      `I'm not sure about that specific topic. Here's what I can help with:\n\n` +
        `• Membership types, requirements, and application\n` +
        `• Accreditation process and stages\n` +
        `• Event registration and details\n` +
        `• Contact information\n\n` +
        `You can also contact us directly at ${knowledgeBase.general.organization.email.general}`,
      
      `That's a great question! For detailed assistance on this topic, I recommend:\n\n` +
        `1. Visiting our Contact page at /contact\n` +
        `2. Emailing ${knowledgeBase.general.organization.email.general}\n` +
        `3. Calling ${knowledgeBase.general.organization.phone} during office hours\n\n` +
        `Or ask me about membership, accreditation, or events!`,
      
      `I don't have specific information on that yet. However, I can help you with:\n\n` +
        `📋 **Membership** - Types, fees, requirements, application\n` +
        `🏥 **Accreditation** - Process, stages, fees, requirements\n` +
        `📅 **Events** - Registration, types, CPD units\n` +
        `📞 **Contact** - Office hours, email, phone, address\n\n` +
        `What would you like to know?`
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    addUserMessage(userMessage);
    setInput('');
    setIsTyping(true);

    // Simulate bot typing delay
    setTimeout(() => {
      const response = findBestMatch(userMessage);
      addBotMessage(response);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "Membership requirements?",
    "Accreditation fees?",
    "How to apply?",
    "Contact information?"
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[999] size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        aria-label="Open PAHA Support Chat"
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-2xl">close</span>
        ) : (
          <>
            <span className="material-symbols-outlined text-2xl">chat</span>
            {messages.length === 0 && (
              <span className="absolute top-0.5 right-0.5 size-3.5 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[999] w-[90vw] max-w-md h-[600px] max-h-[calc(100vh-180px)] bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3.5 bg-primary text-white flex items-center gap-3 shrink-0">
            <div className="size-9 rounded-full bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">support_agent</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm leading-tight">PAHA Virtual Assistant</div>
              <div className="text-[10px] text-white/70 uppercase tracking-wider">Here to help you</div>
            </div>
            <button
              onClick={() => {
                setMessages([]);
                setIsOpen(false);
              }}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
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
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length < 3 && (
            <div className="px-4 py-2 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-white/5">
              <div className="text-[10px] text-slate-400 mb-2">Quick questions:</div>
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
                id="pbot-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                disabled={isTyping || !knowledgeBase}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping || !knowledgeBase}
                className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 text-center">
              This is an AI assistant. For urgent matters, contact us directly.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicChatbot;