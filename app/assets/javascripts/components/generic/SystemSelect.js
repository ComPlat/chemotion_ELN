/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import GridSelect from './GridSelect';

const SystemSelect = (props) => {
  const { unitConfig, selDefined, node } = props;
  const all = unitConfig.map(e => ({ key: e.value, val: e.value, lab: e.label }));
  const dVal = node.data.option_layers;
  return <GridSelect all={all} onChange={selDefined} node={node} dVal={dVal} />;
};

SystemSelect.propTypes = {
  unitConfig: PropTypes.arrayOf(PropTypes.object).isRequired,
  selDefined: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default SystemSelect;
