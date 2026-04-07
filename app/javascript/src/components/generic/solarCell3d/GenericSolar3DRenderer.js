/* eslint-disable react/no-unknown-property */
import React, {
  Suspense, useEffect, useMemo, useState
} from 'react';
import PropTypes from 'prop-types';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { Button, Modal } from 'react-bootstrap';
import SolarCell from 'src/components/generic/solarCell3d/SolarCell';
import LayerList from 'src/components/generic/solarCell3d/LayerList';
import SidePanels from 'src/components/generic/solarCell3d/SidePanels';
import LayerConfigPanel from 'src/components/generic/solarCell3d/LayerConfigPanel';

function CameraZoomController({ zoom }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.fov = 38 / zoom;
    camera.updateProjectionMatrix();
  }, [camera, zoom]);

  return null;
}

CameraZoomController.propTypes = {
  zoom: PropTypes.number.isRequired
};

function Solar3DRenderer({ layers }) {
  const [currentLayers, setCurrentLayers] = useState(layers);
  const [hoveredLayerId, setHoveredLayerId] = useState(null);
  const [canvasTooltip, setCanvasTooltip] = useState({
    visible: false, text: '', x: 0, y: 0
  });
  const [selectedLayerId, setSelectedLayerId] = useState(layers[0] ? layers[0].id : null);
  const [isDeviceParamsOpen, setIsDeviceParamsOpen] = useState(true);
  const [isLayerDetailsOpen, setIsLayerDetailsOpen] = useState(false);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [resetScrollToken, setResetScrollToken] = useState(0);
  const [fullViewZoom, setFullViewZoom] = useState(1);

  useEffect(() => {
    setCurrentLayers(layers);
  }, [layers]);

  useEffect(() => {
    if (!currentLayers.length) {
      setSelectedLayerId(null);
      return;
    }
    if (!currentLayers.find((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(currentLayers[0].id);
    }
  }, [currentLayers, selectedLayerId]);

  const selectedLayer = useMemo(
    () => currentLayers.find((layer) => layer.id === selectedLayerId),
    [currentLayers, selectedLayerId]
  );

  const handleLayerSelect = (layerId) => {
    setSelectedLayerId(layerId);
    setIsDeviceParamsOpen(false);
    setIsLayerDetailsOpen(true);
  };

  const toggleDeviceParams = () => {
    setIsDeviceParamsOpen((prev) => {
      const next = !prev;
      if (next) setIsLayerDetailsOpen(false);
      return next;
    });
  };

  const toggleLayerDetails = () => {
    setIsLayerDetailsOpen((prev) => {
      const next = !prev;
      if (next) setIsDeviceParamsOpen(false);
      return next;
    });
  };

  const handleLayerHoverStart = (layerId, layerName, clientX, clientY) => {
    setHoveredLayerId(layerId);
    setCanvasTooltip({
      visible: true,
      text: layerName,
      x: clientX,
      y: clientY
    });
  };

  const handleLayerHoverMove = (clientX, clientY) => {
    setCanvasTooltip((prev) => ({
      ...prev,
      x: clientX,
      y: clientY
    }));
  };

  const handleLayerHoverEnd = () => {
    setHoveredLayerId(null);
    setCanvasTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleAddLayerAtTop = () => {
    const newId = Math.max(...currentLayers.map((layer) => layer.id), 0) + 1;
    const newLayer = {
      id: newId,
      name: `Layer ${newId}`,
      thickness: 10,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      visible: true
    };
    setCurrentLayers([newLayer, ...currentLayers]);
    setSelectedLayerId(newId);
    setResetScrollToken((prev) => prev + 1);
  };

  const handleZoomOut = () => {
    setFullViewZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))));
  };

  const handleZoomIn = () => {
    setFullViewZoom((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))));
  };

  return (
    <div className="solar3d-root">
      <div className="solar3d-main-row">
        <div className="solar3d-canvas-wrap">
          <Suspense fallback={<div className="solar3d-loading">Loading 3D view...</div>}>
            <Canvas camera={{ position: [13, 4, 3], fov: 38 }}>
              <ambientLight intensity={0.5} />
              <directionalLight intensity={0.5} position={[5, 5, 5]} />
              <SolarCell
                layers={currentLayers}
                hoveredLayerId={hoveredLayerId}
                onLayerHoverStart={handleLayerHoverStart}
                onLayerHoverMove={handleLayerHoverMove}
                onLayerHoverEnd={handleLayerHoverEnd}
                onLayerClick={handleLayerSelect}
              />
              <OrbitControls />
            </Canvas>
          </Suspense>
          {canvasTooltip.visible && (
            <div
              className="solar3d-tooltip"
              style={{
                left: canvasTooltip.x + 12,
                top: canvasTooltip.y + 12
              }}
            >
              {canvasTooltip.text}
            </div>
          )}
        </div>
        <SidePanels
          isDeviceParamsOpen={isDeviceParamsOpen}
          isLayerDetailsOpen={isLayerDetailsOpen}
          selectedLayer={selectedLayer}
          toggleDeviceParams={toggleDeviceParams}
          toggleLayerDetails={toggleLayerDetails}
        />
      </div>
      <div className="solar3d-toolbar">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsFullViewOpen(true)}
        >
          Full View
        </Button>
      </div>
      <LayerList
        layers={currentLayers}
        hoveredLayerId={hoveredLayerId}
        selectedLayerId={selectedLayerId}
        onLayerSelect={handleLayerSelect}
        resetScrollToken={resetScrollToken}
      />
      <Modal
        show={isFullViewOpen}
        onHide={() => setIsFullViewOpen(false)}
        size="xl"
        centered
        className="solar3d-fullview-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Solar Cell 3D - Layers Configuration - Full View</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="solar3d-fullview-layout">
            <div className="solar3d-fullview-canvas">
              <div className="solar3d-fullview-zoom-controls">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={handleZoomOut}
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <i className="fa fa-search-minus" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={handleZoomIn}
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <i className="fa fa-search-plus" aria-hidden="true" />
                </button>
              </div>
              <Suspense fallback={<div className="solar3d-loading">Loading 3D view...</div>}>
                <Canvas camera={{ position: [13, 4, 3], fov: 38 }}>
                  <CameraZoomController zoom={fullViewZoom} />
                  <ambientLight intensity={0.5} />
                  <directionalLight intensity={0.5} position={[5, 5, 5]} />
                  <SolarCell
                    layers={currentLayers}
                    hoveredLayerId={hoveredLayerId}
                    onLayerHoverStart={handleLayerHoverStart}
                    onLayerHoverMove={handleLayerHoverMove}
                    onLayerHoverEnd={handleLayerHoverEnd}
                    onLayerClick={handleLayerSelect}
                  />
                  <OrbitControls />
                </Canvas>
              </Suspense>
              <div className="solar3d-fullview-device-params">
                <button
                  type="button"
                  onClick={toggleDeviceParams}
                  className="solar3d-fullview-device-params__toggle"
                >
                  <span>Device Parameters</span>
                  <i className={isDeviceParamsOpen ? 'fa fa-angle-down' : 'fa fa-angle-up'} aria-hidden="true" />
                </button>
                {isDeviceParamsOpen && (
                  <div className="solar3d-fullview-device-params__content">
                    <div>Efficiency = 14.1 %</div>
                    <div>Voc = 1.0 volt</div>
                    <div>Jsc = 18.6 milliampere / centimeter ** 2</div>
                    <div>FF = 0.8 %</div>
                  </div>
                )}
              </div>
            </div>
            <LayerConfigPanel
              layers={currentLayers}
              setLayers={setCurrentLayers}
              className="solar3d-config-panel solar3d-config-panel--fullview"
              resetScrollToken={resetScrollToken}
              onAddLayer={handleAddLayerAtTop}
            />
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

const layerShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  thickness: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  visible: PropTypes.bool
});

Solar3DRenderer.propTypes = {
  layers: PropTypes.arrayOf(layerShape).isRequired
};

export default Solar3DRenderer;
