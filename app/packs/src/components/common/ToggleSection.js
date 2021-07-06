import React from 'react';
import {
  Tooltip,
  OverlayTrigger
} from 'react-bootstrap';
import PropTypes from 'prop-types';

const ToggleSection = ({ show }) => (
  <div style={{ float: 'right' }}>
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="toggle_section">Toggle Section</Tooltip>}>
      <span style={{ fontSize: 15, color: '#337ab7', lineHeight: '10px' }}>
        <i className={`glyphicon ${(show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'}`} />
      </span>
    </OverlayTrigger>
  </div>
);

ToggleSection.propTypes = {
  show: PropTypes.bool,
};

ToggleSection.defaultProps = {
  show: true
};

export default ToggleSection;
