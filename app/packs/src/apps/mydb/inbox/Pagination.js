import React from 'react';
import PropTypes from 'prop-types';

function Pagination({
  currentDataSetPage, totalPages, handlePrevClick, handleNextClick
}) {
  return (
    <div className="dataset-pagination">
      <button
        onClick={handlePrevClick}
        disabled={currentDataSetPage === 1}
        type="button"
      >
        &#8249;
      </button>
      <button
        onClick={handleNextClick}
        disabled={currentDataSetPage === totalPages}
        type="button"
      >
        &#8250;
      </button>
      <span className="page-count">
        Page
        {' '}
        <span className="current-page">{currentDataSetPage}</span>
        {' '}
        of
        {' '}
        {totalPages}
      </span>
    </div>
  );
}
Pagination.propTypes = {
  currentDataSetPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  handlePrevClick: PropTypes.func.isRequired,
  handleNextClick: PropTypes.func.isRequired,
};

export default Pagination;
