import { Meeting, GoogleCalendarEvent, GoogleTaskItem } from '../types';

// Default initial meetings is now an empty slate so only real user recordings are saved
export const INITIAL_MEETINGS: Meeting[] = [];

// Initial calendar events to represent Google Calendar items
export const UPCOMING_GOOGLE_EVENTS: GoogleCalendarEvent[] = [];

// Initial tasks representing Google Tasks
export const INITIAL_TASKS: GoogleTaskItem[] = [];
