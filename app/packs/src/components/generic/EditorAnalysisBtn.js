/* eslint-disable react/forbid-prop-types */

import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { Tooltip, Button, OverlayTrigger, SplitButton, ButtonGroup, MenuItem } from 'react-bootstrap';

const EditorAnalysisBtn = ({
  element, spcInfos, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate,
}) => (
  <OverlayTrigger
    placement="bottom"
    delayShow={500}
    overlay={<Tooltip id="spectra">Spectra Editor {spcInfos.length > 0 ? '' : ': Reprocess'}</Tooltip>}
  >{spcInfos.length > 0 ? (
    <ButtonGroup className="button-right">
      <SplitButton
        id="spectra-editor-split-button"
        pullRight
        bsStyle="info"
        bsSize="xsmall"
        title={<i className="fa fa-area-chart" />}
        onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
        onClick={toggleSpectraModal}
        disabled={!(spcInfos.length > 0) || !hasChemSpectra}
      >
        <MenuItem
          id="regenerate-spectra"
          key={uuid.v4()}
          onSelect={(eventKey, event) => {
            event.stopPropagation();
            confirmRegenerate(event);
          }}
          disabled={!hasJcamp || !element.can_update}
        >
          <i className="fa fa-refresh" aria-hidden="true" /> Reprocess
        </MenuItem>
      </SplitButton>
    </ButtonGroup>
  ) : (
    <Button
      bsStyle="warning"
      bsSize="xsmall"
      className="button-right"
      onClick={confirmRegenerate}
      disabled={!hasJcamp || !element.can_update || !hasChemSpectra}
    >
      <i className="fa fa-area-chart" /><i className="fa fa-refresh " />
    </Button>
    )}
  </OverlayTrigger>
);

EditorAnalysisBtn.propTypes = {
  element: PropTypes.object,
  hasJcamp: PropTypes.bool,
  spcInfos: PropTypes.array,
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
  confirmRegenerate: PropTypes.func.isRequired,
};

EditorAnalysisBtn.defaultProps = {
  hasJcamp: false,
  spcInfos: [],
  element: {},
  hasChemSpectra: false,
};

export default EditorAnalysisBtn;
