/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl } from 'react-bootstrap';

const FieldSelect = (props) => {
  const { allLayers, selField, node } = props;
  const ly = node.data.layer;
  const allFileds = ((allLayers.find(e => e.key === ly) || {}).fields || []).filter(e => e.type === 'text');
  return (
    <FormGroup bsSize="small" style={{ marginRight: '-10px', marginLeft: '-10px' }}>
      <FormControl componentClass="select" placeholder="select a field" onChange={e => selField(e, node)} defaultValue={node.data.field}>
        {
          allFileds.map(e => <option key={e.field} value={e.field}>{e.field}</option>)
        }
      </FormControl>
    </FormGroup>
  );
};

FieldSelect.propTypes = {
  allLayers: PropTypes.arrayOf(PropTypes.object).isRequired,
  selField: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default FieldSelect;
