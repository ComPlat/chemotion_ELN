import React from 'react';
import PropTypes from 'prop-types';

const ChemrepoLabels = ({ chemrepoId }) => {
  const id = chemrepoId;
  const handleOnClick = (e) => {
    e.stopPropagation();
  };
  return (
    id == null ? <div /> :
      (
        <a href={`https://www.chemotion-repository.net/home/publications/molecules/${id}`} target="_blank" rel="noopener noreferrer" onClick={handleOnClick}>
          <img src="/favicon.ico" className="pubchem-logo" alt="Chemotion Repository" title="Chemotion Repository" />
        </a>
      )
  );
};

ChemrepoLabels.propTypes = {
  chemrepoId: PropTypes.number
};

ChemrepoLabels.defaultProps = {
  chemrepoId: null
};

export default ChemrepoLabels;
