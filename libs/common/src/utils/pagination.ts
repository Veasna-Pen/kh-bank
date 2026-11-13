import { IPaginatedResult } from '../interfaces/api';

export function paginate<T>(
  items: T[],
  totalItems: number,
  page: number,
  limit: number,
): IPaginatedResult<T> {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
