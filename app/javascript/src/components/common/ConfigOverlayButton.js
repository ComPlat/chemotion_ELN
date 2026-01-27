import React from "react";
import { OverlayTrigger, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function ConfigOverlayButton({ popoverSettings, onToggle}) {
  return (
    <div className="position-absolute top-0 end-0">
      <OverlayTrigger
        trigger="click"
        placement="left"
        overlay={popoverSettings}
        onToggle={onToggle}
        rootClose
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
  onToggle: PropTypes.func.isRequired
};
