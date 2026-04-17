import React from 'react';
import { ButtonGroup } from 'react-bootstrap';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

const AnalysisModeToggle = (mode, handleToggleMode, isDisabled = false) => (
  <ButtonGroup>
    <ButtonGroupToggleButton
      size="xsm"
      active={mode === 'edit'}
      onClick={() => handleToggleMode('edit')}
      disabled={isDisabled}
    >
      <i className="fa fa-edit me-1" />
      Edit mode
    </ButtonGroupToggleButton>
    <ButtonGroupToggleButton
      size="xsm"
      active={mode === 'order'}
      onClick={() => handleToggleMode('order')}
      disabled={isDisabled}
    >
      <i className="fa fa-reorder me-1" />
      Order mode
    </ButtonGroupToggleButton>
  </ButtonGroup>
);

export default AnalysisModeToggle;
