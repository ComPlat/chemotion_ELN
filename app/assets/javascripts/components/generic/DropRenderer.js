/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { cloneDeep } from 'lodash';
import GenericElTableDropTarget from './GenericElTableDropTarget';

const DropRenderer = (props) => {
  const {
    opt, sField, onChange, node
  } = props;
  if (!['drag_molecule', 'drag_sample'].includes(sField.type)) return null;
  const { data } = node;
  opt.dndItems = [sField.type.split('_')[1]];
  opt.sField = sField;
  opt.data = data;
  const oopt = cloneDeep(opt);
  return (
    <div className="drop_generic_properties drop_generic_table_wrap">
      <GenericElTableDropTarget opt={oopt} onDrop={onChange} />
    </div>
  );
};

DropRenderer.propTypes = {
  sField: PropTypes.object.isRequired,
  opt: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired
};

export default DropRenderer;
