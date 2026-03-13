import { apiClient } from './apiClient';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  category: string;
  attendees: number;
  status: EventStatus;
}

export interface EventStats {
  total_events: number;
  upcoming_count: number;
  total_attendees: number;
  categories_count: number;
}

export interface EventsResponse {
  results: Event[];
  total: number;
  page: number;
  page_size: number;
  stats: EventStats;
}

export interface EventsQueryParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
}

interface EventPayload {
  id?: number | string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  datetime?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  start_datetime?: string;
  startDateTime?: string;
  end_datetime?: string;
  endDateTime?: string;
  location?: string;
  category?: string;
  attendees?: number | string;
  attendees_count?: number | string;
  status?: string;
}

interface EventStatsPayload {
  total_events?: number | string;
  upcoming_count?: number | string;
  total_attendees?: number | string;
  categories_count?: number | string;
}

interface EventsResponsePayload {
  results?: EventPayload[];
  total?: number | string;
  count?: number | string;
  page?: number | string;
  page_size?: number | string;
  stats?: EventStatsPayload;
}

const EVENT_COLLECTION_ENDPOINTS = [
  '/api/events/',
  '/api/events',
  '/api/admin/events',
  '/api/admin/events/',
] as const;

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const isValidEventId = (value: number): boolean => Number.isInteger(value) && value > 0;
const toDetailPath = (collectionEndpoint: string, id: number): string => {
  const base = stripTrailingSlash(collectionEndpoint);
  return collectionEndpoint.endsWith('/') ? `${base}/${id}/` : `${base}/${id}`;
};

const getErrorStatus = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
  ) {
    return (error as { response?: { status?: number } }).response?.status ?? null;
  }
  return null;
};

const shouldTryNextEndpoint = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status === 403 || status === 404 || status === 405;
};

const isValidationError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status === 400 || status === 422;
};

const requestWithEventEndpointFallback = async <T>(
  request: (endpoint: string) => Promise<T>
): Promise<T> => {
  let lastRecoverableError: unknown = null;

  for (const endpoint of EVENT_COLLECTION_ENDPOINTS) {
    try {
      return await request(endpoint);
    } catch (error) {
      if (shouldTryNextEndpoint(error)) {
        lastRecoverableError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastRecoverableError ?? new Error('No event endpoint is available.');
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeStatus = (value: unknown): EventStatus => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'ongoing') return 'ongoing';
  if (normalized === 'completed') return 'completed';
  return 'upcoming';
};

const normalizeDate = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const normalized = value.trim();
  if (normalized.includes('T')) return normalized.split('T')[0];
  return normalized;
};

const normalizeTime = (value: unknown, datetimeValue?: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    const normalized = value.trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) return normalized.slice(0, 5);
    return normalized;
  }

  if (typeof datetimeValue === 'string' && datetimeValue.includes('T')) {
    const [, timePartRaw = ''] = datetimeValue.split('T');
    const timePart = timePartRaw.replace('Z', '').trim();
    if (timePart.length >= 5) return timePart.slice(0, 5);
  }

  return '';
};

const normalizeEventId = (value: unknown): number => {
  const id = Math.trunc(toNumber(value));
  return isValidEventId(id) ? id : 0;
};

const normalizeEvent = (payload: EventPayload): Event => {
  const startDate = normalizeDate(
    payload.start_date ?? payload.startDate ?? payload.date ?? payload.start_datetime ?? payload.startDateTime ?? payload.datetime
  );
  const endDate = normalizeDate(
    payload.end_date ?? payload.endDate ?? payload.end_datetime ?? payload.endDateTime
  );
  const startTime = normalizeTime(
    payload.start_time ?? payload.startTime ?? payload.time,
    payload.start_datetime ?? payload.startDateTime ?? payload.datetime
  );
  const endTime = normalizeTime(
    payload.end_time ?? payload.endTime,
    payload.end_datetime ?? payload.endDateTime
  );

  return {
    id: normalizeEventId(payload.id),
    title: typeof payload.title === 'string' ? payload.title : '',
    description: typeof payload.description === 'string' ? payload.description : '',
    date: startDate,
    time: startTime,
    start_date: startDate,
    end_date: endDate || startDate,
    start_time: startTime,
    end_time: endTime || startTime,
    location: typeof payload.location === 'string' ? payload.location : '',
    category: typeof payload.category === 'string' ? payload.category : '',
    attendees: Math.trunc(toNumber(payload.attendees ?? payload.attendees_count)),
    status: normalizeStatus(payload.status),
  };
};

const normalizeStats = (events: Event[]): EventStats => {
  return {
    total_events: events.length,
    upcoming_count: events.filter((event) => event.status === 'upcoming').length,
    total_attendees: events.reduce((sum, event) => sum + event.attendees, 0),
    categories_count: new Set(events.map((event) => event.category).filter(Boolean)).size,
  };
};

const normalizeEventsResponse = (payload: unknown): EventsResponse => {
  if (Array.isArray(payload)) {
    const results = payload
      .map((item) => normalizeEvent(item as EventPayload))
      .filter((event) => isValidEventId(event.id));
    return {
      results,
      total: results.length,
      page: 1,
      page_size: results.length,
      stats: normalizeStats(results),
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      results: [],
      total: 0,
      page: 1,
      page_size: 0,
      stats: normalizeStats([]),
    };
  }

  const record = payload as EventsResponsePayload;
  const results = Array.isArray(record.results)
    ? record.results.map(normalizeEvent).filter((event) => isValidEventId(event.id))
    : [];

  return {
    results,
    total: Math.trunc(toNumber(record.total ?? record.count ?? results.length)),
    page: Math.trunc(toNumber(record.page || 1)),
    page_size: Math.trunc(toNumber(record.page_size || results.length)),
    stats: normalizeStats(results),
  };
};

const assertValidEventId = (id: number) => {
  if (!isValidEventId(id)) {
    throw new Error('Invalid event ID.');
  }
};

const buildEventWritePayload = (data: Partial<Event>): EventPayload => {
  const startDate = normalizeDate(data.start_date ?? data.date);
  const endDate = normalizeDate(data.end_date) || startDate;
  const startTime = normalizeTime(data.start_time ?? data.time);
  const endTime = normalizeTime(data.end_time) || startTime;

  return {
    title: data.title,
    description: data.description,
    date: startDate,
    time: startTime,
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    location: data.location,
    category: data.category,
    attendees: data.attendees,
    status: data.status,
  };
};

const buildLegacyEventWritePayload = (data: Partial<Event>): EventPayload => ({
  title: data.title,
  description: data.description,
  date: normalizeDate(data.start_date ?? data.date),
  time: normalizeTime(data.start_time ?? data.time),
  location: data.location,
  category: data.category,
  attendees: data.attendees,
  status: data.status,
});

const requestWithEventPayloadFallback = async (
  request: (payload: EventPayload) => Promise<EventPayload>,
  data: Partial<Event>
): Promise<EventPayload> => {
  const primaryPayload = buildEventWritePayload(data);
  const legacyPayload = buildLegacyEventWritePayload(data);

  try {
    return await request(primaryPayload);
  } catch (error) {
    const hasExtendedFields =
      primaryPayload.end_date !== undefined ||
      primaryPayload.end_time !== undefined ||
      primaryPayload.start_date !== undefined ||
      primaryPayload.start_time !== undefined;

    if (
      !hasExtendedFields ||
      !isValidationError(error) ||
      JSON.stringify(primaryPayload) === JSON.stringify(legacyPayload)
    ) {
      throw error;
    }

    return request(legacyPayload);
  }
};

export const getEvents = async (
  params: EventsQueryParams = {}
): Promise<EventsResponse> => {
  const response = await requestWithEventEndpointFallback((endpoint) =>
    apiClient.get<unknown>(endpoint, { params })
  );
  return normalizeEventsResponse(response.data);
};

export const getEventById = async (id: number): Promise<Event> => {
  assertValidEventId(id);
  const response = await requestWithEventEndpointFallback((endpoint) =>
    apiClient.get<EventPayload>(toDetailPath(endpoint, id))
  );
  return normalizeEvent(response.data);
};

export const createEvent = async (data: Omit<Event, 'id'>): Promise<Event> => {
  const responseData = await requestWithEventEndpointFallback((endpoint) =>
    requestWithEventPayloadFallback(
      async (payload) => (await apiClient.post<EventPayload>(endpoint, payload)).data,
      data
    )
  );
  return normalizeEvent(responseData);
};

export const updateEvent = async (
  id: number,
  data: Partial<Event>
): Promise<Event> => {
  assertValidEventId(id);
  const responseData = await requestWithEventEndpointFallback((endpoint) =>
    requestWithEventPayloadFallback(
      async (payload) => (await apiClient.put<EventPayload>(toDetailPath(endpoint, id), payload)).data,
      data
    )
  );
  return normalizeEvent(responseData);
};

export const deleteEvent = async (id: number): Promise<void> => {
  assertValidEventId(id);
  await requestWithEventEndpointFallback((endpoint) =>
    apiClient.delete(toDetailPath(endpoint, id))
  );
};
