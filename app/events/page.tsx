'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Edit,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  type Event,
  type EventStats,
  type EventStatus,
  updateEvent,
} from '@/services/eventService';

const categories = ['all', 'Corporate', 'Product', 'Team', 'Client', 'Marketing', 'Technology'];
const statusOptions: EventStatus[] = ['upcoming', 'ongoing', 'completed'];

const defaultStats: EventStats = {
  total_events: 0,
  upcoming_count: 0,
  total_attendees: 0,
  categories_count: 0,
};

type EventFormState = Omit<Event, 'id'>;

const emptyFormState: EventFormState = {
  title: '',
  description: '',
  date: '',
  time: '',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  location: '',
  category: 'Corporate',
  attendees: 0,
  status: 'upcoming',
};

const extractErrorDetail = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === 'string') {
    return record.non_field_errors[0];
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }

  return null;
};

const toTimeInputValue = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) return '';
  if (/^\d{2}:\d{2}$/.test(normalized)) return normalized;
  if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) return normalized.slice(0, 5);

  const twelveHour = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minutes = twelveHour[2];
    const meridiem = twelveHour[3].toUpperCase();
    const convertedHour = meridiem === 'PM' ? (hour % 12) + 12 : hour % 12;
    return `${String(convertedHour).padStart(2, '0')}:${minutes}`;
  }

  return '';
};

const formatEventDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getEventStartDate = (event: Event): string => event.start_date || event.date;
const getEventEndDate = (event: Event): string => event.end_date || getEventStartDate(event);
const getEventStartTime = (event: Event): string => event.start_time || event.time;
const getEventEndTime = (event: Event): string => event.end_time || getEventStartTime(event);
const buildEventPayload = (formState: EventFormState): Omit<Event, 'id'> => {
  const startDate = formState.start_date.trim() || formState.date.trim();
  const startTime = formState.start_time.trim() || formState.time.trim();
  const endDate = formState.end_date.trim() || startDate;
  const endTime = formState.end_time.trim() || startTime;

  return {
    ...formState,
    title: formState.title.trim(),
    description: formState.description.trim(),
    date: startDate,
    time: startTime,
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    location: formState.location.trim(),
  };
};

const hasValidEventId = (event: Event | null): event is Event =>
  Boolean(event && Number.isInteger(event.id) && event.id > 0);

export default function EventsPage() {
  const { t } = useLanguage();

  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [formState, setFormState] = useState<EventFormState>(emptyFormState);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const resolveErrorMessage = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          return t('pages.login.errorInvalidTokenRole');
        }

        const detail = extractErrorDetail(err.response?.data);
        if (detail) return detail;
      }

      if (err instanceof Error && err.message.trim().length > 0) {
        return err.message;
      }

      return t('common.failed');
    },
    [t]
  );

  const getInvalidEventMessage = useCallback(
    () =>
      t('pages.events.errors.invalidEventId', {
        defaultValue: 'This event is unavailable because it has an invalid ID.',
      }),
    [t]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getEvents({
        search: debouncedSearch || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
      });

      setEvents(response.results);
      setStats(response.stats);
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
      setEvents([]);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, resolveErrorMessage]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Corporate: 'bg-blue-100 text-blue-600',
      Product: 'bg-purple-100 text-purple-600',
      Team: 'bg-green-100 text-green-600',
      Client: 'bg-yellow-100 text-yellow-600',
      Marketing: 'bg-pink-100 text-pink-600',
      Technology: 'bg-indigo-100 text-indigo-600',
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-600',
      ongoing: 'bg-green-100 text-green-600',
      completed: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const resetForm = () => {
    setFormState(emptyFormState);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    if (!hasValidEventId(event)) {
      setError(getInvalidEventMessage());
      return;
    }

    setError(null);
    setActiveEvent(event);
    setFormState({
      title: event.title,
      description: event.description,
      date: getEventStartDate(event),
      time: toTimeInputValue(getEventStartTime(event)),
      start_date: getEventStartDate(event),
      end_date: getEventEndDate(event),
      start_time: toTimeInputValue(getEventStartTime(event)),
      end_time: toTimeInputValue(getEventEndTime(event)),
      location: event.location,
      category: event.category || 'Corporate',
      attendees: event.attendees,
      status: event.status,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openViewModal = async (event: Event) => {
    if (!hasValidEventId(event)) {
      setError(getInvalidEventMessage());
      return;
    }

    setError(null);
    setViewLoading(true);
    setIsViewModalOpen(true);

    try {
      const detail = await getEventById(event.id);
      setActiveEvent(detail);
    } catch (viewError) {
      setIsViewModalOpen(false);
      setError(resolveErrorMessage(viewError));
    } finally {
      setViewLoading(false);
    }
  };

  const openDeleteModal = (event: Event) => {
    if (!hasValidEventId(event)) {
      setError(getInvalidEventMessage());
      return;
    }

    setError(null);
    setActiveEvent(event);
    setIsDeleteModalOpen(true);
  };

  const closeAllModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(false);
    setActiveEvent(null);
    setFormError('');
  };

  const updateFormValue = (field: keyof EventFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]:
        field === 'attendees'
          ? Math.max(0, Math.trunc(Number(value || 0)))
          : value,
    }));
  };

  const validateForm = () => {
    if (!formState.title.trim() || !(formState.start_date.trim() || formState.date.trim())) {
      setFormError(
        t('pages.events.modals.validationTitleDate', {
          defaultValue: 'Title and starting date are required.',
        })
      );
      return false;
    }
    setFormError('');
    return true;
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      await createEvent(buildEventPayload(formState));
      closeAllModals();
      await fetchEvents();
    } catch (createError) {
      setFormError(resolveErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasValidEventId(activeEvent)) {
      setFormError(getInvalidEventMessage());
      return;
    }
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      await updateEvent(activeEvent.id, buildEventPayload(formState));
      closeAllModals();
      await fetchEvents();
    } catch (updateError) {
      setFormError(resolveErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!hasValidEventId(activeEvent)) {
      setError(getInvalidEventMessage());
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteEvent(activeEvent.id);
      closeAllModals();
      await fetchEvents();
    } catch (deleteError) {
      setError(resolveErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('pages.events.title')}</h1>
          <p className="text-gray-500">{t('pages.events.subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('pages.events.buttons.createEvent')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('pages.events.stats.totalEvents')}</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_events}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('pages.events.stats.upcoming')}</p>
              <p className="text-2xl font-bold text-gray-800">{stats.upcoming_count}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('pages.events.stats.totalAttendees')}</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_attendees}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('pages.events.stats.categories')}</p>
              <p className="text-2xl font-bold text-gray-800">{stats.categories_count}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('pages.events.buttons.searchPlaceholder')}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title={t('pages.events.modals.filterByCategory', { defaultValue: 'Filter by category' })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? t('pages.events.buttons.allCategories') : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-50 cursor-wait' : 'opacity-100'}`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.event')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.schedule')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.location')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.category')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.attendees')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.status')}</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.events.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event, index) => (
                <tr key={event.id ? event.id : `event-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{event.title}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{event.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="grid gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">{t('pages.events.fields.startingDate')}:</span>
                        <span suppressHydrationWarning>{formatEventDate(getEventStartDate(event))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">{t('pages.events.fields.endingDate')}:</span>
                        <span suppressHydrationWarning>{formatEventDate(getEventEndDate(event))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">{t('pages.events.fields.startingHours')}:</span>
                        <span>{getEventStartTime(event) || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">{t('pages.events.fields.endingHours')}:</span>
                        <span>{getEventEndTime(event) || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(event.category)}`}>
                      {event.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {event.attendees}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                      {t(`pages.events.status.${event.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openViewModal(event)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-blue-600"
                        title={t('common.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-green-600"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(event)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-red-600"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : null}

        {!loading && events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('pages.events.noEvents')}
          </div>
        ) : null}
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('pages.events.modals.createTitle', { defaultValue: t('pages.events.buttons.createEvent') })}
              </h3>
              <button onClick={closeAllModals} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.event')}</label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(event) => updateFormValue('title', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.description')}</label>
                  <textarea
                    rows={3}
                    value={formState.description}
                    onChange={(event) => updateFormValue('description', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.startingDate')}</label>
                  <input
                    type="date"
                    value={formState.start_date}
                    onChange={(event) => updateFormValue('start_date', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.endingDate')}</label>
                  <input
                    type="date"
                    value={formState.end_date}
                    onChange={(event) => updateFormValue('end_date', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.startingHours')}</label>
                  <input
                    type="time"
                    value={formState.start_time}
                    onChange={(event) => updateFormValue('start_time', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.endingHours')}</label>
                  <input
                    type="time"
                    value={formState.end_time}
                    onChange={(event) => updateFormValue('end_time', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.location')}</label>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) => updateFormValue('location', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.category')}</label>
                  <select
                    value={formState.category}
                    onChange={(event) => updateFormValue('category', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.filter((category) => category !== 'all').map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.attendees')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formState.attendees}
                    onChange={(event) => updateFormValue('attendees', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.status')}</label>
                  <select
                    value={formState.status}
                    onChange={(event) => updateFormValue('status', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {t(`pages.events.status.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError ? (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {formError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('pages.events.modals.editTitle', { defaultValue: t('common.edit') })}
              </h3>
              <button onClick={closeAllModals} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.event')}</label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(event) => updateFormValue('title', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.description')}</label>
                  <textarea
                    rows={3}
                    value={formState.description}
                    onChange={(event) => updateFormValue('description', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.startingDate')}</label>
                  <input
                    type="date"
                    value={formState.start_date}
                    onChange={(event) => updateFormValue('start_date', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.endingDate')}</label>
                  <input
                    type="date"
                    value={formState.end_date}
                    onChange={(event) => updateFormValue('end_date', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.startingHours')}</label>
                  <input
                    type="time"
                    value={formState.start_time}
                    onChange={(event) => updateFormValue('start_time', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.fields.endingHours')}</label>
                  <input
                    type="time"
                    value={formState.end_time}
                    onChange={(event) => updateFormValue('end_time', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.location')}</label>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) => updateFormValue('location', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.category')}</label>
                  <select
                    value={formState.category}
                    onChange={(event) => updateFormValue('category', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.filter((category) => category !== 'all').map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.attendees')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formState.attendees}
                    onChange={(event) => updateFormValue('attendees', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.events.table.status')}</label>
                  <select
                    value={formState.status}
                    onChange={(event) => updateFormValue('status', event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {t(`pages.events.status.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError ? (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {formError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isViewModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('pages.events.modals.detailsTitle', { defaultValue: t('common.view') })}
              </h3>
              <button onClick={closeAllModals} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {viewLoading || !activeEvent ? (
                <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">{t('pages.events.table.event')}</p>
                    <p className="text-base font-medium text-gray-900">{activeEvent.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('pages.events.fields.description')}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{activeEvent.description || '-'}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.fields.startingDate')}</p>
                      <p className="text-sm font-medium text-gray-900">{formatEventDate(getEventStartDate(activeEvent))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.fields.endingDate')}</p>
                      <p className="text-sm font-medium text-gray-900">{formatEventDate(getEventEndDate(activeEvent))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.fields.startingHours')}</p>
                      <p className="text-sm font-medium text-gray-900">{getEventStartTime(activeEvent) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.fields.endingHours')}</p>
                      <p className="text-sm font-medium text-gray-900">{getEventEndTime(activeEvent) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.table.location')}</p>
                      <p className="text-sm font-medium text-gray-900">{activeEvent.location || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.table.category')}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(activeEvent.category)}`}>
                        {activeEvent.category || '-'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.table.attendees')}</p>
                      <p className="text-sm font-medium text-gray-900">{activeEvent.attendees}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('pages.events.table.status')}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activeEvent.status)}`}>
                        {t(`pages.events.status.${activeEvent.status}`)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end">
                <button
                  onClick={closeAllModals}
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.close', { defaultValue: t('common.cancel') })}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('pages.events.modals.deleteTitle', { defaultValue: t('common.delete') })}
              </h3>
              <button onClick={closeAllModals} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700">
                {t('pages.events.modals.deleteConfirm', {
                  title: activeEvent?.title ?? '',
                  defaultValue: 'Are you sure you want to delete {{title}}?',
                })}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={closeAllModals}
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  type="button"
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
