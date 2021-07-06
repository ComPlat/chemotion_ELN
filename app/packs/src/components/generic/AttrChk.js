/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, FormGroup } from 'react-bootstrap';

const AttrChk = (props) => {
  const { chkAttr, node, attrOpts } = props;
  return (
    <FormGroup bsSize="small" className="generic_tbl_chks">
      {attrOpts.map(e => <Checkbox key={e.value} inline checked={node.data.value.includes(e.value)} onChange={() => chkAttr(e.value, !(node.data.value.includes(e.value)), node)}>{e.label}</Checkbox>)}
    </FormGroup>
  );
};

AttrChk.propTypes = {
  chkAttr: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
  attrOpts: PropTypes.array.isRequired,
};

export default AttrChk;
