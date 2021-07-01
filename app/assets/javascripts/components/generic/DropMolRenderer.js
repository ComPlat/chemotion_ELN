/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const DropMolRenderer = (props) => {
  const { molOpt, sField, node } = props;
  const displayValue = ((node.data[sField.id] || {}).value || {})[`el_${molOpt.value}`] || '';
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}>
      <div role="button" data-clipboard-text={displayValue} className="clipboardBtn" style={{ wordBreak: 'break-all' }}>
        {displayValue}
      </div>
    </OverlayTrigger>
  );
};

DropMolRenderer.propTypes = {
  molOpt: PropTypes.object.isRequired,
  sField: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired
};

export default DropMolRenderer;
