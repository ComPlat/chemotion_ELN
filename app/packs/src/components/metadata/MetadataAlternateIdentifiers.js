import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataAlternateIdentifier from 'src/components/metadata/MetadataAlternateIdentifier';

const MetadataAlternateIdentifiers = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>Alternate identifiers</h4>
    <p>
      An identifier other than the DOI applied to the collection. The alternate identifier
      should be an additional identifier for the same instance of the resource (i.e., same
      location, same file). For other places where the same content can be found, please
      use a related identifier.
    </p>
    {metadata.alternateIdentifiers && metadata.alternateIdentifiers.map((alternateIdentifier, index) => (
      <MetadataAlternateIdentifier
        alternateIdentifier={alternateIdentifier}
        index={index}
        key={index}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('alternateIdentifiers')}>
      Add new alternate identifier
    </Button>
  </div>
);

MetadataAlternateIdentifiers.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataAlternateIdentifiers;
