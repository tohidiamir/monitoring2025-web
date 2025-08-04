// Utility functions for time conversion and formatting

// Format time in Persian format with Iran timezone
export function formatPersianTime(dateString: string | null): string {
  if (!dateString) return 'نامشخص';
  
  try {
    const date = new Date(dateString);
    
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Utc' // Automatically handles timezone conversion
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'نامشخص';
  }
}

// Format time relative to now (e.g., "5 minutes ago")
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'نامشخص';
  
  try {
    const pastDate = new Date(dateString);
    const now = new Date();
    
    // Simple UTC comparison - both dates are already in UTC
    const diffMs = now.getTime() - pastDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 0) {
      return 'آینده'; // Future time
    } else if (diffSeconds < 60) {
      return `${diffSeconds} ثانیه پیش`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} دقیقه پیش`;
    } else if (diffHours < 24) {
      return `${diffHours} ساعت پیش`;
    } else {
      return `${diffDays} روز پیش`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'نامشخص';
  }
}

// Format current time in Persian
export function formatCurrentPersianTime(): string {
  const now = new Date();
  return now.toLocaleString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tehran'
  });
}
