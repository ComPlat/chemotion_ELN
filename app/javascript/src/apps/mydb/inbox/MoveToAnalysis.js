import React from 'react';
import MoveToAnalysisButton from 'src/apps/mydb/inbox/MoveToAnalysisButton';
import PropTypes from 'prop-types';

const ELEMENT_TYPES = ['sample', 'reaction'];

function MoveToAnalysis({ attachment, sourceType }) {
  return (
    ELEMENT_TYPES.map((type) => (
      <MoveToAnalysisButton
        key={type}
        attachment={attachment}
        sourceType={sourceType}
        elementType={type}
      />
    ))
  );
}
MoveToAnalysis.propTypes = {
  attachment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
  }).isRequired,
  sourceType: PropTypes.string,
};

MoveToAnalysis.defaultProps = {
  sourceType: ''
};

export default MoveToAnalysis;
