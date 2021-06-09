/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import GridSelect from './GridSelect';

const FieldSelect = (props) => {
  const { allLayers, selField, types, node } = props;
  const allFileds = ((allLayers.find(e => e.key === node.data.layer) || {}).fields || []).filter(e => (types || ['text']).includes(e.type));
  const all = allFileds.map(e => ({ key: e.field, val: e.field, lab: e.field }));
  const dVal = node.data.field;
  return <GridSelect all={all} onChange={selField} node={node} dVal={dVal} />;
};

FieldSelect.propTypes = {
  allLayers: PropTypes.arrayOf(PropTypes.object).isRequired,
  types: PropTypes.arrayOf(String).isRequired,
  selField: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default FieldSelect;
