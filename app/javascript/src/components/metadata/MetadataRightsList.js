import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, FormControl } from 'react-bootstrap';

import MetadataRights from './MetadataRights'
import MetadataRightsHolder from './MetadataRightsHolder'

const MetadataRightsList = ({ metadata, onAdd, onChange, onRemove }) => {
  return (
    <div>
      <h4>Rights holder</h4>
      <p>
        Name of the holder of the rights of re-use of the research data. Should be in the format "Family name, given name".
      </p>
      {
        metadata.rightsHolders && metadata.rightsHolders.map((rightsHolder, index) => (
          <MetadataRightsHolder
            rightsHolder={rightsHolder} index={index} key={index}
            onChange={onChange} onRemove={onRemove}
          />
        ))
      }
      <Button bsStyle="success" bsSize="small" onClick={event => onAdd('rightsHolders')}>
        Add new rights holder
      </Button>
      <h4>Rights</h4>
      <p>
        Rights information for this resource. The property may be repeated to record complex rights characteristics.
      </p>
      {
        metadata.rights && metadata.rights.map((rights, index) => (
          <MetadataRights
            rights={rights} index={index} key={index}
            onChange={onChange} onRemove={onRemove}
          />
        ))
      }
      <Button bsStyle="success" bsSize="small" onClick={event => onAdd('rights')}>
        Add new rights
      </Button>
    </div>
  )
}

MetadataRightsList.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRightsList;
