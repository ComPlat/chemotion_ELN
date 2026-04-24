import React from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, OverlayTrigger, ButtonGroup, Button,
} from 'react-bootstrap';

export default function SpectraCompareButton({
  spcInfos, toggleSpectraModal, disabled,
}) {
  const isDisabled = disabled || !(spcInfos.length > 0);
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={(
        <Tooltip id="spectra-compare">
          Compare the analytical spectra grouped under this comparison
        </Tooltip>
      )}
    >
      <ButtonGroup>
        <Button
          id="spectra-compare-button"
          variant="info"
          size="xxsm"
          onClick={toggleSpectraModal}
          disabled={isDisabled}
        >
          <i className="fa fa-area-chart" />
        </Button>
      </ButtonGroup>
    </OverlayTrigger>
  );
}

SpectraCompareButton.propTypes = {
  spcInfos: PropTypes.array,
  toggleSpectraModal: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

SpectraCompareButton.defaultProps = {
  spcInfos: [],
  disabled: false,
};
