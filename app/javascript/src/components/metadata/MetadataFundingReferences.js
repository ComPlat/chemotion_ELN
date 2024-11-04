import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataFundingReference from './MetadataFundingReference'

const MetadataFundingReferences = ({ metadata, onAdd, onChange, onRemove }) => {
  return (
    <div>
      <h4>Funding references</h4>
      <p>
        Indication of received third-party funds/grants and the respective sponsor or the funding organisation.
      </p>
      {
        metadata.fundingReferences && metadata.fundingReferences.map((fundingReference, index) => (
          <MetadataFundingReference
            fundingReference={fundingReference} index={index} key={index}
            onChange={onChange} onRemove={onRemove}
          />
        ))
      }
      <Button bsStyle="success" bsSize="small" onClick={event => onAdd('fundingReferences')}>
        Add new funding reference
      </Button>
    </div>
  )
}

MetadataFundingReferences.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataFundingReferences;
