import { SearchRepository } from '../repositories/search-repository';
import type { UserContext, SearchResult } from '@ctcm/types';

/**
 * Service layer for search operations
 * Handles business logic for full-text search
 */
export class SearchService {
  private repository: SearchRepository;

  constructor() {
    this.repository = new SearchRepository();
  }

  /**
   * Search shipments by tracking number, receipt number, customer name, or description
   * Implements full-text search with pagination and tenant isolation
   */
  async searchShipments(
    query: string,
    page: number,
    limit: number,
    userContext: UserContext
  ): Promise<SearchResult> {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Perform search with tenant isolation
    const { shipments, total } = await this.repository.searchShipments(
      query,
      limit,
      offset,
      userContext
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      shipments,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }
}
