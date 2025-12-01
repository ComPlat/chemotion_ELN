import React from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, OverlayTrigger, ButtonGroup, Dropdown, Button
} from 'react-bootstrap';

export default function SpectraCompareButton({
  sample, spcInfos, spectraCompare,
  toggleSpectraModal,
}) {
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="spectra">Spectra Editor</Tooltip>}
    >
      <ButtonGroup>
        <Button
          id="spectra-compare-button"
          variant="info"
          size="xxsm"
          onClick={toggleSpectraModal}
          disabled={!(spcInfos.length > 1) && (spectraCompare.length > 1)}
        >
          <i className="fa fa-area-chart" />
        </Button>
      </ButtonGroup>
    </OverlayTrigger>
  );
}

SpectraCompareButton.propTypes = {
  sample: PropTypes.object,
  spectraCompare: PropTypes.object,
  spcInfos: PropTypes.array,
  toggleSpectraModal: PropTypes.func.isRequired,
};

SpectraCompareButton.defaultProps = {
  spectraCompare: [],
  spcInfos: [],
  sample: {},
};
