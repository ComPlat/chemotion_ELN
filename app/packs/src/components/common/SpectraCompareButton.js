import React from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, OverlayTrigger, SplitButton, ButtonGroup,
} from 'react-bootstrap';

export default function SpectraCompareButton({
  sample, spcInfos, spectraCompare,
  toggleSpectraModal,
}) {
  return (
    <OverlayTrigger
      placement="bottom"
      delayShow={500}
      overlay={<Tooltip id="spectra">Spectra Editor</Tooltip>}
    >
      <ButtonGroup className="button-right">
        <SplitButton
          id="spectra-editor-split-button"
          pullRight
          bsStyle="info"
          bsSize="xsmall"
          title={<i className="fa fa-area-chart" />}
          onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
          onClick={toggleSpectraModal}
          disabled={!(spcInfos.length > 0) && (spectraCompare.length > 0)}
        >
        </SplitButton>
      </ButtonGroup>
    </OverlayTrigger>
  );
}

SpectraCompareButton.propTypes = {
  sample: PropTypes.object,
  spectraCompare: PropTypes.object,
  spcInfos: PropTypes.array,
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
};

SpectraCompareButton.defaultProps = {
  spectraCompare: [],
  spcInfos: [],
  sample: {},
  hasChemSpectra: false,
};
