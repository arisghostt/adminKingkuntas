'use client';

import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Search, Star, Archive, Trash2, Mail, CheckCircle, AlertCircle, Clock, MoreVertical, ChevronRight, ChevronLeft, Reply, Forward, Paperclip } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface Email {
  id: number;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
  starred: boolean;
  label: 'inbox' | 'sent' | 'draft' | 'spam';
}

export default function EmailPage() {
  const { t } = useLanguage();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'inbox' | 'starred' | 'sent' | 'draft' | 'spam'>('inbox');
  
  const [emails, setEmails] = useState<Email[]>([
    { id: 1, sender: 'Sarah Johnson', senderEmail: 'sarah@company.com', subject: 'Project Update - Q1 2025', preview: 'I wanted to share the latest updates on our Q1 project. Everything is on track and...', time: '10:30 AM', read: false, starred: true, label: 'inbox' },
    { id: 2, sender: 'Michael Chen', senderEmail: 'michael@techcorp.com', subject: 'Meeting Scheduled for Tomorrow', preview: 'Hi team, just confirming our meeting for tomorrow at 2 PM. Please review the...', time: '9:15 AM', read: true, starred: false, label: 'inbox' },
    { id: 3, sender: 'Emily Davis', senderEmail: 'emily@designstudio.com', subject: 'New Design Mockups Attached', preview: 'Here are the latest design mockups for the website redesign. Let me know your thoughts...', time: 'Yesterday', read: true, starred: true, label: 'inbox' },
    { id: 4, sender: 'Alex Turner', senderEmail: 'alex@startup.io', subject: 'Partnership Opportunity', preview: 'I came across your company and I believe there might be a great partnership...', time: 'Yesterday', read: false, starred: false, label: 'spam' },
    { id: 5, sender: 'Jessica Brown', senderEmail: 'jessica@marketing.com', subject: 'Marketing Campaign Results', preview: 'The Q4 marketing campaign has exceeded our expectations. Here are the key metrics...', time: 'Monday', read: true, starred: false, label: 'inbox' },
    { id: 6, sender: 'David Wilson', senderEmail: 'david@support.com', subject: 'Customer Support Weekly Report', preview: 'Here is the weekly summary of customer support tickets and resolution times...', time: 'Monday', read: false, starred: false, label: 'inbox' },
    { id: 7, sender: 'You', senderEmail: 'me@company.com', subject: 'Re: Project Timeline', preview: 'Thanks for the update. I think we should extend the timeline by two weeks...', time: 'Monday', read: true, starred: false, label: 'sent' },
  ]);
  
  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = currentTab === 'starred' ? email.starred : email.label === currentTab;
    return matchesSearch && matchesTab;
  });
  
  const toggleStar = (id: number) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, starred: !email.starred } : email
    ));
  };
  
  const getTabCounts = () => {
    return {
      inbox: emails.filter(e => e.label === 'inbox').length,
      starred: emails.filter(e => e.starred).length,
      sent: emails.filter(e => e.label === 'sent').length,
      draft: emails.filter(e => e.label === 'draft').length,
      spam: emails.filter(e => e.label === 'spam').length,
    };
  };
  
  const counts = getTabCounts();
  
  const tabs = [
    { id: 'inbox', label: t('pages.email.inbox'), icon: Mail, count: counts.inbox },
    { id: 'starred', label: t('pages.email.starred'), icon: Star, count: counts.starred },
    { id: 'sent', label: t('pages.email.sent'), icon: CheckCircle, count: counts.sent },
    { id: 'draft', label: t('pages.email.drafts'), icon: AlertCircle, count: counts.draft },
    { id: 'spam', label: t('pages.email.spam'), icon: AlertCircle, count: counts.spam },
  ] as const;
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('pages.email.title')}</h1>
        <p className="text-gray-500">{t('pages.email.subtitle')}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-220px)]">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 p-4">
            <button className="w-full mb-4 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              {t('pages.email.compose')}
            </button>
            
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    currentTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <tab.icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  {tab.count > 0 && (
                    <span className={`text-sm ${
                      currentTab === tab.id ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'
                    } px-2 py-0.5 rounded-full`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('common.search')}</h3>
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  {t('pages.email.labels.work')}
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  {t('pages.email.labels.personal')}
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  {t('pages.email.labels.important')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Email List or Detail */}
          {selectedEmail ? (
            <div className="flex-1 flex flex-col">
              {/* Detail Header */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-lg font-semibold text-gray-800">{selectedEmail.subject}</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleStar(selectedEmail.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Star className={`w-5 h-5 ${selectedEmail.starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Archive className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Email Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {selectedEmail.sender.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-800">{selectedEmail.sender}</h3>
                      <p className="text-sm text-gray-500">{selectedEmail.senderEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{selectedEmail.time}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-gray-700 leading-relaxed">
                    {selectedEmail.preview}
                    {' '}Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-4">
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                </div>
                
                <div className="mt-6 flex items-center space-x-4">
                  <button className="flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Reply className="w-4 h-4 mr-2" />
                    {t('common.reply')}
                  </button>
                  <button className="flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Forward className="w-4 h-4 mr-2" />
                    {t('common.forward')}
                  </button>
                  <button className="flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Paperclip className="w-4 h-4 mr-2" />
                    {t('pages.email.attachments')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('pages.email.search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Email List */}
              <div className="flex-1 overflow-y-auto">
                {filteredEmails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      email.read ? 'hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors mr-3"
                        >
                          <Star className={`w-4 h-4 ${email.starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <span className={`font-medium truncate ${email.read ? 'text-gray-700' : 'text-gray-900'}`}>
                              {email.sender}
                            </span>
                            {!email.read && (
                              <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${email.read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                            {email.subject}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{email.preview}</p>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <span className="text-xs text-gray-400">{email.time}</span>
                        {email.label === 'sent' && (
                          <span className="text-xs text-gray-400 mt-1">{t('pages.email.sent')}</span>
                        )}
                        {email.label === 'spam' && (
                          <span className="text-xs text-red-500 mt-1">{t('pages.email.spam')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredEmails.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    {t('pages.email.noEmails')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

