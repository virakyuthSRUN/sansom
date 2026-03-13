// src/lib/userId.ts

const TRACKER_STORAGE_KEY = 'tracker_user_id';
const CHAT_STORAGE_KEY = 'chat_user_id';

// Generate a random 3-digit number for the user ID
export const generateRandomUserId = (): string => {
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `student-${randomNum}`;
};

// Get or create tracker user ID
export const getOrCreateTrackerUserId = (): string => {
  let userId = localStorage.getItem(TRACKER_STORAGE_KEY);
  
  if (!userId) {
    userId = generateRandomUserId();
    localStorage.setItem(TRACKER_STORAGE_KEY, userId);
    console.log('🆕 Generated new tracker user ID:', userId);
  }
  
  return userId;
};

// Get or create chat user ID (syncs with tracker)
export const getOrCreateChatUserId = (): string => {
  // First try to use the same ID as tracker
  const trackerId = localStorage.getItem(TRACKER_STORAGE_KEY);
  
  if (trackerId) {
    // Ensure chat has the same ID
    localStorage.setItem(CHAT_STORAGE_KEY, trackerId);
    console.log('🔄 Synced chat user ID with tracker:', trackerId);
    return trackerId;
  }
  
  // If no tracker ID exists, generate a new one
  let userId = localStorage.getItem(CHAT_STORAGE_KEY);
  
  if (!userId) {
    userId = generateRandomUserId();
    localStorage.setItem(CHAT_STORAGE_KEY, userId);
    console.log('🆕 Generated new chat user ID:', userId);
  }
  
  return userId;
};

// Sync both user IDs (useful after clearing storage)
export const syncUserIds = (): string => {
  const newId = generateRandomUserId();
  localStorage.setItem(TRACKER_STORAGE_KEY, newId);
  localStorage.setItem(CHAT_STORAGE_KEY, newId);
  console.log('🔄 Synced both user IDs to:', newId);
  return newId;
};

// Clear both user IDs
export const clearUserIds = (): void => {
  localStorage.removeItem(TRACKER_STORAGE_KEY);
  localStorage.removeItem(CHAT_STORAGE_KEY);
  console.log('🧹 Cleared all user IDs');
};

// Get current tracker user ID (without creating)
export const getTrackerUserId = (): string | null => {
  return localStorage.getItem(TRACKER_STORAGE_KEY);
};

// Get current chat user ID (without creating)
export const getChatUserId = (): string | null => {
  return localStorage.getItem(CHAT_STORAGE_KEY);
};