import React, { useState } from 'react';
import { OverlayTrigger, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function ConfigOverlayButton({
  popoverSettings, onClose, wrapperClassName, popperConfig,
}) {
  const defaultClassName = 'position-absolute top-0 end-0';
  const className = wrapperClassName !== undefined ? wrapperClassName : defaultClassName;
  const [show, setShow] = useState(false);

  // Fire onClose on the true -> false edge only, so the popover persists its
  // changes exactly once whether it is dismissed via the x or via rootClose.
  const handleToggle = (next) => {
    if (show && !next) { onClose?.(); }
    setShow(next);
  };

  return (
    <div className={className}>
      <OverlayTrigger
        trigger="click"
        placement="left"
        overlay={popoverSettings({ close: () => handleToggle(false) })}
        show={show}
        onToggle={handleToggle}
        rootClose
        popperConfig={popperConfig}
      >
        <Button
          size="xsm"
          variant="light"
        >
          <i className="fa fa-sliders" />
        </Button>
      </OverlayTrigger>
    </div>
  );
}

ConfigOverlayButton.propTypes = {
  popoverSettings: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  wrapperClassName: PropTypes.string,
  popperConfig: PropTypes.object,
};

ConfigOverlayButton.defaultProps = {
  onClose: undefined,
  wrapperClassName: undefined,
  popperConfig: undefined,
};
