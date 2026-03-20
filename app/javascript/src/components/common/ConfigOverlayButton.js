import React, { useState } from 'react';
import { OverlayTrigger, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function ConfigOverlayButton({
  popoverSettings, wrapperClassName, popperConfig, onClose,
}) {
  const defaultClassName = 'position-absolute top-0 end-0';
  const className = wrapperClassName !== undefined ? wrapperClassName : defaultClassName;
  const [show, setShow] = useState(false);

  const handleToggle = (next) => {
    setShow((prev) => {
      if (prev && !next) {
        onClose?.();
      }
      return next;
    });
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
          className="m-1"
        >
          <i className="fa fa-sliders" />
        </Button>
      </OverlayTrigger>
    </div>
  );
}

ConfigOverlayButton.propTypes = {
  popoverSettings: PropTypes.element.isRequired,
  onToggle: PropTypes.func.isRequired,
  wrapperClassName: PropTypes.string,
  popperConfig: PropTypes.object,
};
