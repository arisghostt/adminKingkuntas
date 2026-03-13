'use client';

import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  Phone, 
  FileText, 
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Video,
  Download,
  MessageSquare,
  Send,
  ShoppingCart,
  BarChart3
} from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: 'How do I reset my password?',
    answer: 'Go to Settings > Security > Change Password. Enter your current password and then your new password twice to confirm. Make sure your new password is at least 8 characters long and includes numbers and special characters.',
    category: 'Account',
  },
  {
    id: 2,
    question: 'How can I add a new product?',
    answer: 'Navigate to Products > Add Product. Fill in the required information including product name, description, price, and upload product images. You can also set inventory levels and category assignments.',
    category: 'Products',
  },
  {
    id: 3,
    question: 'How do I process a refund?',
    answer: 'Go to Orders, find the relevant order, and click on Details. Scroll down to find the refund option. Enter the refund amount and reason, then confirm the refund. The customer will receive an email notification.',
    category: 'Orders',
  },
  {
    id: 4,
    question: 'Can I export my sales data?',
    answer: 'Yes! Navigate to Reports. Use the date range selector to choose your desired period, then click Export CSV or Export PDF to download your data in your preferred format.',
    category: 'Reports',
  },
  {
    id: 5,
    question: 'How do I enable two-factor authentication?',
    answer: 'Go to Settings > Security. Click on Enable 2FA and follow the instructions to set up authentication via an authenticator app like Google Authenticator or Authy.',
    category: 'Security',
  },
  {
    id: 6,
    question: 'How can I view customer details?',
    answer: 'Navigate to Customers from the sidebar. Click on any customer to view their profile, order history, and other details. You can also search for specific customers using the search bar.',
    category: 'Customers',
  },
];

const guideCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of the admin dashboard',
    icon: Book,
    articles: [
      { title: 'Dashboard Overview', readTime: '5 min' },
      { title: 'Navigation Guide', readTime: '3 min' },
      { title: 'Setting Up Your Account', readTime: '7 min' },
      { title: 'Customizing Your View', readTime: '4 min' },
    ],
  },
  {
    id: 'products',
    title: 'Product Management',
    description: 'Managing your product catalog',
    icon: FileText,
    articles: [
      { title: 'Adding Products', readTime: '8 min' },
      { title: 'Managing Inventory', readTime: '6 min' },
      { title: 'Product Categories', readTime: '5 min' },
      { title: 'Bulk Product Updates', readTime: '10 min' },
    ],
  },
  {
    id: 'orders',
    title: 'Order Processing',
    description: 'Handling orders and fulfillment',
    icon: ShoppingCart,
    articles: [
      { title: 'Processing Orders', readTime: '7 min' },
      { title: 'Managing Returns', readTime: '6 min' },
      { title: 'Shipping Integration', readTime: '9 min' },
      { title: 'Order Notifications', readTime: '4 min' },
    ],
  },
  {
    id: 'reports',
    title: 'Analytics and Reports',
    description: 'Understanding your data',
    icon: BarChart3,
    articles: [
      { title: 'Sales Reports', readTime: '8 min' },
      { title: 'Customer Analytics', readTime: '6 min' },
      { title: 'Exporting Data', readTime: '5 min' },
      { title: 'Custom Dashboards', readTime: '10 min' },
    ],
  },
];

const faqCategories = ['All', 'Account', 'Products', 'Orders', 'Reports', 'Security', 'Customers'];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedFaqCategory, setSelectedFaqCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFaqCategory === 'All' || faq.category === selectedFaqCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', contactForm);
    alert('Your message has been sent! We will respond within 24 hours.');
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Help and Documentation</h1>
        <p className="text-gray-600">Find answers, guides, and support resources</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help articles, FAQs, or guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-sm text-gray-500">Popular searches:</span>
            {['password', 'products', 'orders', 'reports', 'refunds'].map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Book, label: 'Documentation', description: 'Browse all guides', color: 'bg-blue-100 text-blue-600' },
          { icon: Video, label: 'Video Tutorials', description: 'Watch how-to videos', color: 'bg-purple-100 text-purple-600' },
          { icon: MessageCircle, label: 'Community', description: 'Join the forum', color: 'bg-green-100 text-green-600' },
          { icon: MessageSquare, label: 'Live Chat', description: 'Talk to support', color: 'bg-yellow-100 text-yellow-600' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`inline-flex p-3 rounded-lg ${item.color} mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.label}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guides Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Documentation Guides */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Book className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Documentation Guides</h2>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                View All <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {guideCategories.map((category) => {
                const Icon = category.icon;
                const isExpanded = expandedCategory === category.id;
                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-900">{category.title}</h3>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="bg-white">
                        {category.articles.map((article, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                          >
                            <span className="text-gray-700">{article.title}</span>
                            <span className="text-sm text-gray-400">{article.readTime} read</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {faqCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedFaqCategory(category)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedFaqCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-left">
                      <span className="text-xs text-blue-600 font-medium mb-1 block">{faq.category}</span>
                      <span className="font-medium text-gray-900">{faq.question}</span>
                    </div>
                    {expandedFaq === faq.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="p-4 bg-white border-t border-gray-100">
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}

              {filteredFaqs.length === 0 && (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No FAQs found matching your search</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Support Sidebar */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need More Help?</h3>
            <p className="text-gray-600 mb-6">Our support team is available 24/7 to assist you.</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Live Chat</p>
                  <p className="text-sm text-gray-500">Instant support</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">support@example.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Us a Message</h3>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a topic</option>
                  <option value="account">Account Issues</option>
                  <option value="orders">Order Problems</option>
                  <option value="payments">Payment Questions</option>
                  <option value="technical">Technical Support</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          </div>

          {/* Resources */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                <Download className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">Download User Manual (PDF)</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                <Video className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">Watch Video Tutorials</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">API Documentation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

