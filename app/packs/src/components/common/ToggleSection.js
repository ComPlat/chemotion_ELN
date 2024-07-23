import React from 'react';
import {
  Tooltip,
  OverlayTrigger
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import ChevronIcon from 'src/components/common/ChevronIcon';

const ToggleSection = ({ show }) => (
  <div style={{ float: 'right' }}>
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="toggle_section">Toggle Section</Tooltip>}>
      <ChevronIcon direction={show ? 'down' : 'right'} color="primary"/>
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
