'use client';

import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Send, Search, MoreVertical, Phone, Video, Image, Paperclip } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface Message {
  id: number;
  sender: 'user' | 'other';
  text: string;
  time: string;
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

export default function ChatPage() {
  const { t } = useLanguage();
  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0]);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'other', text: 'Hey! How are you doing?', time: '10:30 AM' },
    { id: 2, sender: 'user', text: 'I\'m doing great, thanks for asking! How about you?', time: '10:32 AM' },
    { id: 3, sender: 'other', text: 'Pretty good! Just working on the new project.', time: '10:33 AM' },
    { id: 4, sender: 'other', text: 'Did you see the latest updates?', time: '10:34 AM' },
    { id: 5, sender: 'user', text: 'Yes, I reviewed them. Looks great!', time: '10:35 AM' },
    { id: 6, sender: 'other', text: 'Awesome! Let me know if you have any questions.', time: '10:36 AM' },
  ]);
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const sendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        sender: 'user',
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setMessage('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('pages.chat.title')}</h1>
        <p className="text-gray-500">{t('pages.chat.subtitle')}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-220px)]">
        <div className="flex h-full">
          {/* Contacts List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('pages.chat.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Contacts */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedContact.id === contact.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {contact.avatar}
                      </div>
                      {contact.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-800 truncate">{contact.name}</h3>
                        <span className="text-xs text-gray-400">{contact.time}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{contact.lastMessage}</p>
                    </div>
                    {contact.unread > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {selectedContact.avatar}
                  </div>
                  {selectedContact.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-800">{selectedContact.name}</h3>
                  <p className="text-sm text-green-500">{t('pages.chat.online')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-xs ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'} mt-1 block`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Image className="w-5 h-5 text-gray-600" />
                </button>
                <input
                  type="text"
                  placeholder={t('pages.chat.typeMessage')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const contacts: Contact[] = [
  { id: 1, name: 'Sarah Johnson', avatar: 'SJ', lastMessage: 'Hey! How are you doing?', time: '10:30 AM', unread: 0, online: true },
  { id: 2, name: 'Michael Chen', avatar: 'MC', lastMessage: 'Did you see the latest updates?', time: '9:15 AM', unread: 2, online: true },
  { id: 3, name: 'Emily Davis', avatar: 'ED', lastMessage: 'Thanks for your help!', time: 'Yesterday', unread: 0, online: false },
  { id: 4, name: 'Alex Turner', avatar: 'AT', lastMessage: 'Let\'s schedule a meeting', time: 'Yesterday', unread: 1, online: true },
  { id: 5, name: 'Jessica Brown', avatar: 'JB', lastMessage: 'The project looks great!', time: 'Monday', unread: 0, online: false },
  { id: 6, name: 'David Wilson', avatar: 'DW', lastMessage: 'Can you review this?', time: 'Monday', unread: 3, online: true },
  { id: 7, name: 'Lisa Anderson', avatar: 'LA', lastMessage: 'Great job on the presentation!', time: 'Sunday', unread: 0, online: false },
];

