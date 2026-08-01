export type SortKey = "newest" | "oldest" | "members" | "alpha";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "members", label: "Most Members" },
  { value: "alpha", label: "Alphabetical" },
];

export function filterAndSort<T>(
  items: T[],
  config: {
    search: string;
    searchFields: ((item: T) => string)[];
    sortKey: SortKey;
    sortDate: (item: T) => string | null;
    sortMembers: (item: T) => number;
    sortName: (item: T) => string;
    categoryFilter?: string | string[];
    categoryIds?: (item: T) => string[];
  }
): T[] {
  let result = items;

  if (config.search.trim()) {
    const q = config.search.toLowerCase();
    result = result.filter((item) =>
      config.searchFields.some((fn) => fn(item).toLowerCase().includes(q))
    );
  }

  if (config.categoryFilter && config.categoryIds) {
    const filters = Array.isArray(config.categoryFilter)
      ? config.categoryFilter
      : config.categoryFilter
        ? [config.categoryFilter]
        : [];
    if (filters.length > 0) {
      const getCatIds = config.categoryIds;
      result = result.filter((item) =>
        getCatIds(item).some((id) => filters.includes(id))
      );
    }
  }

  switch (config.sortKey) {
    case "newest":
      result = [...result].sort(
        (a, b) =>
          new Date(config.sortDate(b) ?? 0).getTime() -
          new Date(config.sortDate(a) ?? 0).getTime()
      );
      break;
    case "oldest":
      result = [...result].sort(
        (a, b) =>
          new Date(config.sortDate(a) ?? 0).getTime() -
          new Date(config.sortDate(b) ?? 0).getTime()
      );
      break;
    case "members":
      result = [...result].sort(
        (a, b) => config.sortMembers(b) - config.sortMembers(a)
      );
      break;
    case "alpha":
      result = [...result].sort((a, b) =>
        config.sortName(a).localeCompare(config.sortName(b))
      );
      break;
  }

  return result;
}
