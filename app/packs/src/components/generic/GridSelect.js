/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl } from 'react-bootstrap';

const GridSelect = (props) => {
  const {
    all, onChange, node, dVal
  } = props;
  return (
    <FormGroup bsSize="small" style={{ marginRight: '-10px', marginLeft: '-10px' }}>
      <FormControl componentClass="select" placeholder="select..." onChange={e => onChange(e, node)} defaultValue={dVal}>
        {all.map(e => <option key={e.key} value={e.val}>{e.lab}</option>)}
      </FormControl>
    </FormGroup>
  );
};

GridSelect.propTypes = {
  all: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    val: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    lab: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })).isRequired,
  onChange: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
  dVal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default GridSelect;
