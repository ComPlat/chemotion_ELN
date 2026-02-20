import React from "react";
import { OverlayTrigger, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function ConfigOverlayButton({
  popoverSettings, onToggle, wrapperClassName, popperConfig,
}) {
  const defaultClassName = "position-absolute top-0 end-0";
  const className = wrapperClassName !== undefined ? wrapperClassName : defaultClassName;

  return (
    <div className={className}>
      <OverlayTrigger
        trigger="click"
        placement="left"
        overlay={popoverSettings}
        onToggle={onToggle}
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
