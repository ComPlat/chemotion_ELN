import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataFundingReference from 'src/components/metadata/MetadataFundingReference';

const MetadataFundingReferences = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>Funding references</h4>
    <p>
      Indication of received third-party funds/grants and the respective sponsor or the funding organisation.
    </p>
    {metadata.fundingReferences && metadata.fundingReferences.map((fundingReference, index) => (
      <MetadataFundingReference
        fundingReference={fundingReference}
        index={index}
        key={index}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('fundingReferences')}>
      Add new funding reference
    </Button>
  </div>
);

MetadataFundingReferences.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataFundingReferences;
