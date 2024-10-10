/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import MolViewerModal from 'src/components/viewer/MolViewerModal';
import UIStore from 'src/stores/alt/stores/UIStore';

export default class MolViewerBtn extends Component {
  constructor(props) {
    super(props);
    this.state = { show: false };
    this.handleModalOpen = this.handleModalOpen.bind(this);
  }

  handleModalOpen(e) {
    if (e) {
      e.stopPropagation();
    }
    const { show } = this.state;
    this.setState({ show: !show });
  }

  render() {
    const {
      disabled, fileContent, isPublic, viewType, className
    } = this.props;
    const { show } = this.state;
    const config = UIStore.getState().moleculeViewer;
    if (isPublic && !config?.featureEnabled) return null;
    if (!fileContent) return null;

    return (
      <>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="tooltip_molviewer" style={{ pointerEvents: 'none' }}>
              Click to see structure in Viewer
            </Tooltip>
          )}
        >
          <Button
            className={className}
            size="xxsm"
            variant="info"
            disabled={disabled}
            onClick={(e) => this.handleModalOpen(e)}
          >
            <i className="fa fa-cube me-1" aria-hidden="true" />
            View in 3D
          </Button>
        </OverlayTrigger>
        <MolViewerModal
          fileContent={fileContent}
          handleModalOpen={(e) => this.handleModalOpen(e)}
          isPublic={isPublic}
          show={show}
          viewType={viewType}
        />
      </>
    );
  }
}

MolViewerBtn.propTypes = {
  disabled: PropTypes.bool.isRequired,
  fileContent: PropTypes.string.isRequired,
  isPublic: PropTypes.bool.isRequired,
  viewType: PropTypes.string.isRequired,
  className: PropTypes.string,
};

MolViewerBtn.defaultProps = { className: 'button-right' };
