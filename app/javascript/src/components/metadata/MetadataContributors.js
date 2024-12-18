import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataContributor from 'src/components/metadata/MetadataContributor';

const MetadataContributors = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>Contributors</h4>
    <p>
      The persons or institutions responsible for collecting, managing, distributing, or otherwise contributing to the
      development of the resource.
    </p>
    {metadata.contributors && metadata.contributors.map((creator, index) => (
      <MetadataContributor
        contributor={creator}
        index={index}
        key={index}
        onAdd={onAdd}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('contributors')}>
      Add new contributor
    </Button>
  </div>
);

MetadataContributors.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataContributors;
