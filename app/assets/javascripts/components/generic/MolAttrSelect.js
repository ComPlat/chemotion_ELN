/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, FormGroup } from 'react-bootstrap';
import { molOptions } from '../../admin/generic/Utils';

const MolAttrSelect = (props) => {
  const { selMolAttr, node } = props;
  return (
    <FormGroup bsSize="small" className="generic_tbl_chks">
      {molOptions.map(e => <Checkbox key={e.value} inline checked={node.data.value.includes(e.value)} onChange={() => selMolAttr(e.value, !(node.data.value.includes(e.value)), node)}>{e.label}</Checkbox>)}
    </FormGroup>
  );
};

MolAttrSelect.propTypes = {
  selMolAttr: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default MolAttrSelect;
