import React from "react";

const Pagination = ({ currentPage, totalPages, handlePrevClick, handleNextClick }) => {
  return (
    <div className="dataset-pagination">
      <button
        onClick={handlePrevClick}
        disabled={currentPage === 1}
        type="button"
      >
        &#8249;
      </button>
      <button
        onClick={handleNextClick}
        disabled={currentPage === totalPages}
        type="button"
      >
        &#8250;
      </button>
    </div>
  );
};

export default Pagination;
