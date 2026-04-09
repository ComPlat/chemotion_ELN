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

const LAYER_SCALE = 0.02;
const CELL_WIDTH = 4;
const CELL_DEPTH = 4;

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

function DetailsCameraFitController({ layers, zoomFactor }) {
  const { camera } = useThree();

  useEffect(() => {
    const totalHeight = layers.reduce((sum, layer) => sum + (layer.thickness * LAYER_SCALE), 0);
    const maxDim = Math.max(CELL_WIDTH, CELL_DEPTH, totalHeight);
    const fovRad = (camera.fov * Math.PI) / 180;
    const fitDistance = (maxDim / 2) / Math.tan(fovRad / 2);
    const distance = (fitDistance * 1.35) / zoomFactor;

    camera.position.set(distance, distance * 0.35, distance * 0.25);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, layers, zoomFactor]);

  return null;
}

DetailsCameraFitController.propTypes = {
  layers: PropTypes.arrayOf(
    PropTypes.shape({
      thickness: PropTypes.number.isRequired
    })
  ).isRequired,
  zoomFactor: PropTypes.number.isRequired
};

function Solar3DRenderer({ layers }) {
  const [detailLayers, setDetailLayers] = useState(layers);
  const [modalLayers, setModalLayers] = useState(layers);
  const [hoveredLayerId, setHoveredLayerId] = useState(null);
  const [canvasTooltip, setCanvasTooltip] = useState({
    visible: false, text: '', x: 0, y: 0
  });
  const [selectedLayerId, setSelectedLayerId] = useState(layers[0] ? layers[0].id : null);
  const [isDeviceParamsOpen, setIsDeviceParamsOpen] = useState(true);
  const [isLayerDetailsOpen, setIsLayerDetailsOpen] = useState(false);
  const [modalIsDeviceParamsOpen, setModalIsDeviceParamsOpen] = useState(true);
  const [modalIsLayerDetailsOpen, setModalIsLayerDetailsOpen] = useState(false);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [resetScrollToken, setResetScrollToken] = useState(0);
  const [modalResetScrollToken, setModalResetScrollToken] = useState(0);
  const [fullViewZoom, setFullViewZoom] = useState(1);

  useEffect(() => {
    setDetailLayers(layers);
    setModalLayers(layers);
  }, [layers]);

  useEffect(() => {
    if (!detailLayers.length) {
      setSelectedLayerId(null);
      return;
    }
    if (!detailLayers.find((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(detailLayers[0].id);
    }
  }, [detailLayers, selectedLayerId]);

  const selectedDetailLayer = useMemo(
    () => detailLayers.find((layer) => layer.id === selectedLayerId),
    [detailLayers, selectedLayerId]
  );

  const selectedModalLayer = useMemo(
    () => modalLayers.find((layer) => layer.id === selectedLayerId),
    [modalLayers, selectedLayerId]
  );

  const handleLayerSelect = (layerId) => {
    setSelectedLayerId(layerId);
    setIsDeviceParamsOpen(false);
    setIsLayerDetailsOpen(true);
    setModalIsDeviceParamsOpen(false);
    setModalIsLayerDetailsOpen(true);
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
    const newId = Math.max(...modalLayers.map((layer) => layer.id), 0) + 1;
    const newLayer = {
      id: newId,
      name: `Layer ${newId}`,
      thickness: 10,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      visible: true
    };
    setModalLayers([newLayer, ...modalLayers]);
    setSelectedLayerId(newId);
    setModalResetScrollToken((prev) => prev + 1);
  };

  const handleOpenFullView = () => {
    setModalLayers(detailLayers);
    setIsFullViewOpen(true);
  };

  const handleCloseFullView = () => {
    setIsFullViewOpen(false);
  };

  const handleSaveFullView = () => {
    setDetailLayers(modalLayers);
    setResetScrollToken((prev) => prev + 1);
    setIsFullViewOpen(false);
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
              <DetailsCameraFitController layers={detailLayers} zoomFactor={0.8} />
              <ambientLight intensity={0.5} />
              <directionalLight intensity={0.5} position={[5, 5, 5]} />
              {detailLayers.length > 0 && (
                <SolarCell
                  layers={detailLayers}
                  hoveredLayerId={hoveredLayerId}
                  onLayerHoverStart={handleLayerHoverStart}
                  onLayerHoverMove={handleLayerHoverMove}
                  onLayerHoverEnd={handleLayerHoverEnd}
                  onLayerClick={handleLayerSelect}
                />
              )}
              <OrbitControls enableRotate enableZoom={false} />
            </Canvas>
          </Suspense>
          {!detailLayers.length && (
            <div className="solar3d-canvas-empty-state">No layers yet. Go to View/Controls.</div>
          )}
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
          onOpenFullView={handleOpenFullView}
          hasLayers={detailLayers.length > 0}
          isDeviceParamsOpen={isDeviceParamsOpen}
          isLayerDetailsOpen={isLayerDetailsOpen}
          selectedLayer={selectedDetailLayer}
          toggleDeviceParams={toggleDeviceParams}
          toggleLayerDetails={toggleLayerDetails}
        />
      </div>
      {detailLayers.length > 0 && (
        <LayerList
          layers={detailLayers}
          hoveredLayerId={hoveredLayerId}
          selectedLayerId={selectedLayerId}
          onLayerSelect={handleLayerSelect}
          resetScrollToken={resetScrollToken}
        />
      )}
      <Modal
        show={isFullViewOpen}
        onHide={handleCloseFullView}
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
              {modalLayers.length > 0 && (
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
              )}
              <Suspense fallback={<div className="solar3d-loading">Loading 3D view...</div>}>
                <Canvas camera={{ position: [13, 4, 3], fov: 38 }}>
                  <CameraZoomController zoom={fullViewZoom} />
                  <ambientLight intensity={0.5} />
                  <directionalLight intensity={0.5} position={[5, 5, 5]} />
                  {modalLayers.length > 0 && (
                    <SolarCell
                      layers={modalLayers}
                      hoveredLayerId={hoveredLayerId}
                      onLayerHoverStart={handleLayerHoverStart}
                      onLayerHoverMove={handleLayerHoverMove}
                      onLayerHoverEnd={handleLayerHoverEnd}
                      onLayerClick={handleLayerSelect}
                    />
                  )}
                  <OrbitControls enableRotate enableZoom enablePan />
                </Canvas>
              </Suspense>
              {!modalLayers.length && (
                <div className="solar3d-canvas-empty-state solar3d-canvas-empty-state--modal">
                  Add new layers to begin.
                </div>
              )}
              {modalLayers.length > 0 && (
                <div className="solar3d-fullview-device-params">
                  <div className="solar3d-panel-card">
                    <button
                      type="button"
                      onClick={() => {
                        setModalIsDeviceParamsOpen((prev) => {
                          const next = !prev;
                          if (next) setModalIsLayerDetailsOpen(false);
                          return next;
                        });
                      }}
                      className="solar3d-panel-toggle"
                    >
                      <span>Device Parameters</span>
                      <i
                        className={modalIsDeviceParamsOpen ? 'fa fa-angle-down' : 'fa fa-angle-up'}
                        aria-hidden="true"
                      />
                    </button>
                    {modalIsDeviceParamsOpen && (
                      <div className="solar3d-panel-content">
                        <div>Efficiency = 14.1 %</div>
                        <div>Voc = 1.0 volt</div>
                        <div>Jsc = 18.6 milliampere / centimeter ** 2</div>
                        <div>FF = 0.8 %</div>
                      </div>
                    )}
                  </div>
                  {selectedModalLayer && (
                    <div className="solar3d-panel-card solar3d-fullview-device-params__layer-block">
                      <button
                        type="button"
                        onClick={() => {
                          setModalIsLayerDetailsOpen((prev) => {
                            const next = !prev;
                            if (next) setModalIsDeviceParamsOpen(false);
                            return next;
                          });
                        }}
                        className="solar3d-panel-toggle"
                      >
                        <span>Layer Details</span>
                        <i
                          className={modalIsLayerDetailsOpen ? 'fa fa-angle-down' : 'fa fa-angle-up'}
                          aria-hidden="true"
                        />
                      </button>
                      {modalIsLayerDetailsOpen && (
                        <div className="solar3d-panel-content">
                          <div>{`Name = ${selectedModalLayer.name}`}</div>
                          <div>{`Thickness = ${selectedModalLayer.thickness} nm`}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
            <LayerConfigPanel
              layers={modalLayers}
              setLayers={setModalLayers}
              className="solar3d-config-panel solar3d-config-panel--fullview"
              resetScrollToken={modalResetScrollToken}
              onAddLayer={handleAddLayerAtTop}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="solar3d-fullview-footer">
          <Button
            variant="secondary"
            onClick={handleCloseFullView}
          >
            Close
          </Button>
          <Button
            variant="warning"
            onClick={handleSaveFullView}
          >
            Save
          </Button>
        </Modal.Footer>
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
