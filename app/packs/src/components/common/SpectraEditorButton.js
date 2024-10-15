/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, Button, OverlayTrigger, ButtonGroup, Dropdown
} from 'react-bootstrap';

export default function SpectraEditorButton({
  element, spcInfos, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate, confirmRegenerateEdited,
  hasEditedJcamp, toggleNMRDisplayerModal, hasNMRium
}) {
  return (
    <>
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
            <Dropdown as={ButtonGroup}>
              <Button
                id="spectra-editor-split-button"
                variant="info"
                size="xxsm"
                onToggle={(_, event) => { if (event) { event.stopPropagation(); } }}
                onClick={toggleSpectraModal}
                disabled={!(spcInfos.length > 0) || !hasChemSpectra}
              >
                <i className="fa fa-area-chart" />
              </Button>
              <Dropdown.Toggle split variant="info" id="dropdown-split-basic" size="xxsm" />
              <Dropdown.Menu>
                <Dropdown.Item
                  id="regenerate-spectra"
                  key="regenerate-spectra"
                  onClick={(event) => {
                    event.stopPropagation();
                    confirmRegenerate(event);
                  }}
                  disabled={!hasJcamp || !element.can_update}
                >
                  <i className="fa fa-refresh me-1" />
                  Reprocess
                </Dropdown.Item>
                {hasEditedJcamp
                  && (
                    <Dropdown.Item
                      id="regenerate-edited-spectra"
                      key="regenerate-edited-spectra"
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmRegenerateEdited(event);
                      }}
                    >
                      <i className="fa fa-refresh me-1" />
                      Regenerate .edit.jdx files
                    </Dropdown.Item>
                  )}
              </Dropdown.Menu>
            </Dropdown>
          </ButtonGroup>
        ) : (
          <Button
            variant="warning"
            size="xxsm"
            onClick={confirmRegenerate}
            disabled={!hasJcamp || !element.can_update || !hasChemSpectra}
            className="d-inline-flex align-items-center"
          >
            <i className="fa fa-area-chart" />
            <i className="fa fa-refresh " />
          </Button>
        )}
      </OverlayTrigger>

      {
        hasNMRium && (
          <OverlayTrigger
            placement="top"
            delayShow={500}
            overlay={<Tooltip id="spectra_nmrium_wrapper">Process with NMRium</Tooltip>}
          >
            <ButtonGroup>
              <Button
                id="spectra-editor-split-button"
                variant="info"
                size="xxsm"
                onToggle={(_, event) => { if (event) { event.stopPropagation(); } }}
                onClick={toggleNMRDisplayerModal}
                disabled={!hasJcamp && !(spcInfos.length > 0)}
              >
                <i className="fa fa-bar-chart" />
              </Button>
            </ButtonGroup>
          </OverlayTrigger>
        )
      }
    </>
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
