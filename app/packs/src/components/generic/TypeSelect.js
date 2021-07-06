/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import GridSelect from './GridSelect';

const TypeSelect = (props) => {
  const { all, selType, node } = props;
  const dVal = node.data.type;
  return <GridSelect all={all} onChange={selType} node={node} dVal={dVal} />;
};

TypeSelect.propTypes = {
  all: PropTypes.arrayOf(PropTypes.object).isRequired,
  selType: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired
};

export default TypeSelect;
