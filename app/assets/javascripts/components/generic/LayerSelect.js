/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl } from 'react-bootstrap';

const LayerSelect = (props) => {
  const { allLayers, selLayer, node } = props;
  return (
    <FormGroup bsSize="small" style={{ marginRight: '-10px', marginLeft: '-10px' }}>
      <FormControl componentClass="select" placeholder="select a layer" onChange={e => selLayer(e, node)} defaultValue={node.data.layer}>
        {
          allLayers.map(e => <option key={e.key} value={e.key}>{e.key}</option>)
        }
      </FormControl>
    </FormGroup>
  );
};

LayerSelect.propTypes = {
  allLayers: PropTypes.arrayOf(PropTypes.object).isRequired,
  selLayer: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default LayerSelect;
