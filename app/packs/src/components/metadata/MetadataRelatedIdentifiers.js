import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataRelatedIdentifier from 'src/components/metadata/MetadataRelatedIdentifier';

const MetadataRelatedIdentifiers = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>Releated identifiers</h4>
    <p>
      Identifiers of related resources. These must be globally unique identifiers (e.g. DOI, URL).
    </p>
    {metadata.relatedIdentifiers && metadata.relatedIdentifiers.map((relatedIdentifier, index) => (
      <MetadataRelatedIdentifier
        relatedIdentifier={relatedIdentifier}
        index={index}
        key={index}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('relatedIdentifiers')}>
      Add new related identifier
    </Button>
  </div>
);

MetadataRelatedIdentifiers.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRelatedIdentifiers;
