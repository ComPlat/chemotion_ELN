import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';

function GenericElementVariations({ element }) {
  if (!element || !element.element_klass) return null;
  const count = Number(element.variations_count) || 0;
  if (count === 0) return null;

  return (
    <Badge bg="info">
      {`${count} variation${count > 1 ? 's' : ''}`}
    </Badge>
  );
}

GenericElementVariations.propTypes = {
  element: PropTypes.shape({
    element_klass: PropTypes.shape({ name: PropTypes.string }),
    variations_count: PropTypes.number,
  }).isRequired,
};

export default GenericElementVariations;
