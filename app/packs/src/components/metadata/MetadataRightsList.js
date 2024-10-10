import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import MetadataRights from 'src/components/metadata/MetadataRights';
import MetadataRightsHolder from 'src/components/metadata/MetadataRightsHolder';

const MetadataRightsList = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>Rights holder</h4>
    <p>
      Name of the holder of the rights of re-use of the research data.
      Should be in the format &quot;Family name, given name&quot;.
    </p>
    {metadata.rightsHolders && metadata.rightsHolders.map((rightsHolder, index) => (
      <MetadataRightsHolder
        rightsHolder={rightsHolder}
        index={index}
        key={index}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('rightsHolders')}>
      Add new rights holder
    </Button>

    <hr />

    <h4>Rights</h4>
    <p>
      Rights information for this resource. The property may be repeated to record complex rights characteristics.
    </p>
    {metadata.rights && metadata.rights.map((rights, index) => (
      <MetadataRights
        rights={rights}
        index={index}
        key={index}
        onChange={onChange}
        onRemove={onRemove}
      />
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('rights')}>
      Add new rights
    </Button>
  </div>
);

MetadataRightsList.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRightsList;
