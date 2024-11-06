import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataCreator from 'src/components/metadata/MetadataCreator';

const MetadataCreators = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>Creators</h4>
    <p>
      The main researchers involved in producing the data, or the authors of the publication.
    </p>
    {metadata.creators && metadata.creators.map((creator, index) => (
      <MetadataCreator
        creator={creator}
        index={index}
        key={index}
        onAdd={onAdd}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('creators')}>
      Add new creator
    </Button>
  </div>
);

MetadataCreators.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataCreators;
