// src/utils/date.ts

/**
 * Formats an ISO date string to DD/MM/YYYY format
 * @param dateString - ISO date string (e.g. "2025-08-16T10:40:39.214Z")
 * @returns Formatted string like "16/08/2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);

  // Early return for invalid dates
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
