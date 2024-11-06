/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { RepoNewModal, Constants } from 'chem-generic-ui';

function SyncBtn(props) {
  const {
    data,
    fnCreate,
    fnModalClose,
    fnModalOpen,
    genericType,
    klasses,
    showModal,
  } = props;
  return (
    <>
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={(
          <Tooltip id="_tooltip_fetch_from_hub">
            Fetch public templates from Hub
          </Tooltip>
        )}
      >
        <Button
          className="mb-3 me-1"
          variant="info"
          size="sm"
          onClick={fnModalOpen}
        >
          <i className="fa fa-refresh" aria-hidden="true" />
          {' '}
          Fetch from LabIMotion Hub
        </Button>
      </OverlayTrigger>
      <RepoNewModal
        content={genericType}
        fnClose={fnModalClose}
        fnCreate={fnCreate}
        gridData={data}
        klasses={klasses}
        showModal={showModal}
      />
    </>
  );
}

SyncBtn.propTypes = {
  data: PropTypes.array,
  fnCreate: PropTypes.func.isRequired,
  fnModalClose: PropTypes.func.isRequired,
  fnModalOpen: PropTypes.func.isRequired,
  genericType: PropTypes.oneOf([
    Constants.GENERIC_TYPES.ELEMENT,
    Constants.GENERIC_TYPES.SEGMENT,
    Constants.GENERIC_TYPES.DATASET,
  ]).isRequired,
  klasses: PropTypes.array,
  showModal: PropTypes.bool.isRequired,
};

SyncBtn.defaultProps = { data: [], klasses: [] };

export default SyncBtn;
