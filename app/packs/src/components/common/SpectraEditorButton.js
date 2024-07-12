import React from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, Button, OverlayTrigger, SplitButton, ButtonGroup
} from 'react-bootstrap';
import MenuItem from 'src/components/legacyBootstrap/MenuItem'

export default function SpectraEditorButton({
  element, spcInfos, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate, confirmRegenerateEdited,
  hasEditedJcamp, toggleNMRDisplayerModal, hasNMRium
}) {
  return (
    <span>
      <OverlayTrigger
        placement="bottom"
        delayShow={500}
        overlay={(
          <Tooltip id="spectra">
            Spectra Editor
            {spcInfos.length > 0 ? '' : ': Reprocess'}
          </Tooltip>
)}
      >
        {spcInfos.length > 0 ? (
          <ButtonGroup>
            <SplitButton
              id="spectra-editor-split-button"
              pullRight
              variant="info"
              size="sm"
              title={<i className="fa fa-area-chart" />}
              onToggle={(_, event) => { if (event) { event.stopPropagation(); } }}
              onClick={toggleSpectraModal}
              disabled={!(spcInfos.length > 0) || !hasChemSpectra}
            >
              <MenuItem
                id="regenerate-spectra"
                key="regenerate-spectra"
                onSelect={(_, event) => {
                  event.stopPropagation();
                  confirmRegenerate(event);
                }}
                disabled={!hasJcamp || !element.can_update}
              >
                <i className="fa fa-refresh" />
                {' '}
                Reprocess
              </MenuItem>
              {
            hasEditedJcamp
              ? (
                <MenuItem
                  id="regenerate-edited-spectra"
                  key="regenerate-edited-spectra"
                  onSelect={(_, event) => {
                    event.stopPropagation();
                    confirmRegenerateEdited(event);
                  }}
                >
                  <i className="fa fa-refresh" />
                  {' '}
                  Regenerate .edit.jdx files
                </MenuItem>
              ) : <span />
          }
            </SplitButton>
          </ButtonGroup>
        ) : (
          <Button
            variant="warning"
              size="xsm"
            onClick={confirmRegenerate}
            disabled={!hasJcamp || !element.can_update || !hasChemSpectra}
          >
            <i className="fa fa-area-chart" />
            <i className="fa fa-refresh " />
          </Button>
        )}
      </OverlayTrigger>

      {
          hasNMRium ? (
            <OverlayTrigger
              placement="top"
              delayShow={500}
              overlay={<Tooltip id="spectra_nmrium_wrapper">Process with NMRium</Tooltip>}
            >
              <ButtonGroup>
                <Button
                  id="spectra-editor-split-button"
                  pullRight
                  variant="info"
                  size="sm"
                  onToggle={(_, event) => { if (event) { event.stopPropagation(); } }}
                  onClick={toggleNMRDisplayerModal}
                  disabled={!hasJcamp && !(spcInfos.length > 0)}
                >
                  <i className="fa fa-bar-chart" />
                </Button>
              </ButtonGroup>
            </OverlayTrigger>
          ) : null
      }
    </span>
  );
}

SpectraEditorButton.propTypes = {
  element: PropTypes.object,
  hasJcamp: PropTypes.bool,
  spcInfos: PropTypes.array,
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
  confirmRegenerate: PropTypes.func.isRequired,
  confirmRegenerateEdited: PropTypes.func.isRequired,
  hasEditedJcamp: PropTypes.bool,
  toggleNMRDisplayerModal: PropTypes.func.isRequired,
  hasNMRium: PropTypes.bool,
};

SpectraEditorButton.defaultProps = {
  hasJcamp: false,
  spcInfos: [],
  element: {},
  hasChemSpectra: false,
  hasEditedJcamp: false,
  hasNMRium: false,
};
