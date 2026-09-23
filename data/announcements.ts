export interface Announcement {
  id: string;
  emoji: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  details?: string[];
  date?: string;
}
