/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import GridSelect from './GridSelect';

const LayerSelect = (props) => {
  const { allLayers, selLayer, node } = props;
  const all = allLayers.map(e => ({ key: e.key, val: e.key, lab: e.key }));
  const dVal = node.data.layer;
  return <GridSelect all={all} onChange={selLayer} node={node} dVal={dVal} />;
};

LayerSelect.propTypes = {
  allLayers: PropTypes.arrayOf(PropTypes.object).isRequired,
  selLayer: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default LayerSelect;
