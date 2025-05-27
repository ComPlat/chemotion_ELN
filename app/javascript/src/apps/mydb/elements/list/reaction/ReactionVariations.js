import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';

function ReactionVariations({ element }) {
  if (element.type !== 'reaction' || !element.variations || element.variations.length === 0) {
    return null;
  }

  return (
    <Badge bg="info">
      {`${element.variations.length} variation${element.variations.length > 1 ? 's' : ''}`}
    </Badge>
  );
}

ReactionVariations.propTypes = {
  element: PropTypes.shape({
    type: PropTypes.string,
    variations: PropTypes.array,
  }).isRequired,
};

export default ReactionVariations;
