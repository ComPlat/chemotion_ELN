import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup } from 'react-bootstrap';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

const AnalysisModeToggle = ({ mode, onToggle, disabled = false }) => (
  <ButtonGroup>
    <ButtonGroupToggleButton
      size="xsm"
      active={mode === 'edit'}
      onClick={() => onToggle('edit')}
      disabled={disabled}
    >
      <i className="fa fa-edit me-1" />
      Edit mode
    </ButtonGroupToggleButton>
    <ButtonGroupToggleButton
      size="xsm"
      active={mode === 'order'}
      onClick={() => onToggle('order')}
      disabled={disabled}
    >
      <i className="fa fa-reorder me-1" />
      Order mode
    </ButtonGroupToggleButton>
  </ButtonGroup>
);

AnalysisModeToggle.propTypes = {
  mode: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default AnalysisModeToggle;
