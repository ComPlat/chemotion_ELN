/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const DropTextRenderer = (props) => {
  const { attr, sField, node } = props;
  let displayValue = ((node.data[sField.id] || {}).value || {})[`el_${attr.value}`] || '';
  displayValue = (attr.value === 'molecular_weight' && displayValue !== '') ? displayValue.toFixed(6) : displayValue;
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}>
      <div role="button" data-clipboard-text={displayValue} className="clipboardBtn" style={{ wordBreak: 'break-all', cursor: 'copy' }}>
        {displayValue}
      </div>
    </OverlayTrigger>
  );
};

DropTextRenderer.propTypes = {
  attr: PropTypes.object.isRequired,
  sField: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired
};

export default DropTextRenderer;
