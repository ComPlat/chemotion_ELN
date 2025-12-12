import React from 'react';
import PropTypes from 'prop-types';
import { Card, Badge, Pagination } from 'react-bootstrap';
import SearchResultCard from './SearchResultCard';

/**
 * Search results list with pagination
 */
const SearchResults = ({
  results,
  onResultClick,
  page,
  totalPages,
  onPageChange
}) => {
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // First page
    if (startPage > 1) {
      items.push(
        <Pagination.First key="first" onClick={() => onPageChange(1)} />
      );
      items.push(
        <Pagination.Ellipsis key="ellipsis-start" disabled />
      );
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => onPageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Last page
    if (endPage < totalPages) {
      items.push(
        <Pagination.Ellipsis key="ellipsis-end" disabled />
      );
      items.push(
        <Pagination.Last key="last" onClick={() => onPageChange(totalPages)} />
      );
    }

    return (
      <Pagination className="justify-content-center mt-4 mb-0">
        <Pagination.Prev
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        />
        {items}
        <Pagination.Next
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        />
      </Pagination>
    );
  };

  return (
    <div className="search-results mt-3">
      <div className="results-list">
        {results.map((result, index) => (
          <SearchResultCard
            key={result._id || result.id || index}
            result={result}
            onClick={() => onResultClick(result)}
          />
        ))}
      </div>

      {renderPagination()}
    </div>
  );
};

SearchResults.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
  onResultClick: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired
};

export default SearchResults;
