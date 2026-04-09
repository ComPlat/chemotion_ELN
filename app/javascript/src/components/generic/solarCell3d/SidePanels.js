import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function SidePanels({
  onOpenFullView,
  hasLayers,
  isDeviceParamsOpen,
  isLayerDetailsOpen,
  selectedLayer,
  toggleDeviceParams,
  toggleLayerDetails
}) {
  return (
    <div className="solar3d-side-panels">
      <div className="solar3d-panel-actions-row">
        <div className="solar3d-panel-card solar3d-panel-card--controls">
          <button
            type="button"
            onClick={onOpenFullView}
            className="solar3d-panel-toggle solar3d-panel-toggle--action"
            aria-label="Open full view controls"
            title="Open full view controls"
          >
            <span>View/Controls</span>
            <i className="fa fa-sliders" aria-hidden="true" />
          </button>
        </div>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="solar3dZoomInfo">Zoom is available in view/controls.</Tooltip>}
        >
          <button
            type="button"
            className="solar3d-panel-info-btn"
            aria-label="Zoom availability info"
          >
            <i className="fa fa-info-circle" aria-hidden="true" />
          </button>
        </OverlayTrigger>
      </div>
      {hasLayers && (
        <div className="solar3d-panel-card">
          <button
            type="button"
            onClick={toggleDeviceParams}
            className="solar3d-panel-toggle"
          >
            <span>Device Parameters</span>
            <i className={isDeviceParamsOpen ? 'fa fa-angle-down' : 'fa fa-angle-up'} aria-hidden="true" />
          </button>
          {isDeviceParamsOpen && (
            <div className="solar3d-panel-content">
              <div>Efficiency = 14.1 %</div>
              <div>Voc = 1.0 volt</div>
              <div>Jsc = 18.6 milliampere / centimeter ** 2</div>
              <div>FF = 0.8 %</div>
            </div>
          )}
        </div>
      )}

      {selectedLayer && (
        <div className="solar3d-panel-card">
          <button
            type="button"
            onClick={toggleLayerDetails}
            className="solar3d-panel-toggle solar3d-panel-toggle--layer"
          >
            <span>Layer Details</span>
            <i className={isLayerDetailsOpen ? 'fa fa-angle-down' : 'fa fa-angle-up'} aria-hidden="true" />
          </button>
          {isLayerDetailsOpen && (
            <div className="solar3d-panel-content solar3d-panel-content--layer">
              <div>{`Name = ${selectedLayer.name}`}</div>
              <div>{`Thickness = ${selectedLayer.thickness} nm`}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const selectedLayerShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  thickness: PropTypes.number.isRequired,
  visible: PropTypes.bool,
  color: PropTypes.string.isRequired
});

SidePanels.propTypes = {
  onOpenFullView: PropTypes.func.isRequired,
  hasLayers: PropTypes.bool,
  isDeviceParamsOpen: PropTypes.bool.isRequired,
  isLayerDetailsOpen: PropTypes.bool.isRequired,
  selectedLayer: selectedLayerShape,
  toggleDeviceParams: PropTypes.func.isRequired,
  toggleLayerDetails: PropTypes.func.isRequired
};

SidePanels.defaultProps = {
  hasLayers: true,
  selectedLayer: null
};
