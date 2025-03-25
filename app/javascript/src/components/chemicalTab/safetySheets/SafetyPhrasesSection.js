import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

/**
 * Component for displaying and fetching safety phrases
 */
function SafetyPhrasesSection({
  vendor,
  fetchSafetyPhrases
}) {
  return (
    <Button
      id="safetyPhrases-btn"
      onClick={() => fetchSafetyPhrases(vendor)}
      variant="light"
    >
      fetch Safety Phrases
    </Button>
  );
}

SafetyPhrasesSection.propTypes = {
  vendor: PropTypes.string.isRequired,
  fetchSafetyPhrases: PropTypes.func.isRequired
};

export default SafetyPhrasesSection;