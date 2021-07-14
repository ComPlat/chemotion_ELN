/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import GridSelect from './GridSelect';

const FieldSelect = (props) => {
  const { allLayers, selField, types, node, tableText } = props;
  const allFileds = ((allLayers.find(e => e.key === node.data.layer) || {}).fields || []).filter(e => (types || ['text']).includes(e.type));
  const all = allFileds.map(e => ({ key: e.field, val: e.field, lab: e.field }));

  if (tableText && tableText === true) {
    const tableFileds = ((allLayers.find(e => e.key === node.data.layer) || {}).fields || []).filter(e => e.type === 'table');
    tableFileds.forEach((tbl) => {
      ((tbl.sub_fields || []).filter(e => e.type === 'text') || []).forEach((sf) => {
        const tfl = { key: `${tbl.field}${sf.id}`, val: `${tbl.field}[@@]${sf.id}`, lab: `${tbl.field}.${sf.col_name}` };
        all.push(tfl);
      });
    });
  }
  const dVal = node.data.field;
  return <GridSelect all={all} onChange={selField} node={node} dVal={dVal} />;
};

FieldSelect.propTypes = {
  allLayers: PropTypes.arrayOf(PropTypes.object).isRequired,
  types: PropTypes.arrayOf(String).isRequired,
  tableText: PropTypes.bool,
  selField: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

FieldSelect.defaultProps = { tableText: false };

export default FieldSelect;
