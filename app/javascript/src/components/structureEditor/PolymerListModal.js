/* eslint-disable max-len */
import { PropTypes } from 'mobx-react';
import React, { useState, useEffect } from 'react';
import {
  Accordion, Button, Card, Modal
} from 'react-bootstrap';
import {
  BodyRectangleIcon,
  MultiHatched,
  NotFound,
  PhaseSeparatedSupportSolidDivided,
  PorousHatched,
  ActivePhasePromotors,
  PolymerShapes,
  ActivePhaseAlloy,
  ActivePhaseFullCoating,
  BodySolid,
  RescaleCanvas
} from 'src/components/structureEditor/TemplatesSurfaceChemistry';

const iconMap = {
  BodyRectangleIcon,
  MultiHatched,
  NotFound,
  PhaseSeparatedSupportSolidDivided,
  PorousHatched,
  ActivePhasePromotors,
  ActivePhaseAlloy,
  ActivePhaseFullCoating,
  BodySolid
};

function PolymerListModal({
  loading, onShapeSelection, title, onCloseClick
}) {
  const [shapesList, setShapeList] = useState([]); // Initialize the state as an empty array

  useEffect(() => {
    const fetchTemplateList = async () => {
      try {
        const response = await fetch('/json/surfaceChemistryShapes.json');
        const templateListStorage = await response.json();
        setShapeList(templateListStorage);
      } catch (error) {
        console.error('Error fetching the JSON data:', error);
      }
    };

    fetchTemplateList();
  }, []);
  return (
    <Modal
      centered
      className="w-500 h-500 top-50 start-50 translate-middle"
      style={{ zIndex: '10000' }}
      contentClassName="border-1"
      animation
      show={loading}
      onHide={onCloseClick}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* defaultActiveKey="1" */}
        <Accordion>
          {shapesList.map((tab) => (
            <Card key={tab.id}>
              <Card.Header>
                {/* Use Accordion.Item and Accordion.Header */}
                <Accordion.Item eventKey={String(tab.id)}>
                  <Accordion.Header>{tab.label}</Accordion.Header>
                </Accordion.Item>
              </Card.Header>
              <Accordion.Collapse eventKey={String(tab.id)}>
                <Card.Body>
                  <Accordion>
                    {tab.subTabs.map((subTab) => (
                      <Card key={subTab.id}>
                        <Card.Header>
                          {/* Use Accordion.Item and Accordion.Header for sub-tabs */}
                          <Accordion.Item eventKey={subTab.id}>
                            <Accordion.Header>{subTab.label}</Accordion.Header>
                          </Accordion.Item>
                        </Card.Header>
                        <Accordion.Collapse eventKey={subTab.id}>
                          <Card.Body>
                            {subTab?.shapes?.map((shape) => {
                              const PolymerIcon = iconMap[shape.iconName];
                              return (
                                <Button
                                  key={shape.template_id}
                                  variant="normal"
                                  onClick={async () => {
                                    if (shape.template_id && shape.template_id < 6) {
                                      onShapeSelection(shape.template_id);
                                      return;
                                    }
                                    alert('Shape not allowed to use for now');
                                  }}
                                >
                                  <PolymerIcon />
                                </Button>
                              );
                            })}

                          </Card.Body>
                        </Accordion.Collapse>
                      </Card>
                    ))}
                  </Accordion>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
          ))}
        </Accordion>
      </Modal.Body>
    </Modal>
  );
}

const PolymerListIconKetcherToolbarButton = (iframeDocument) => {
  const parentElement = iframeDocument.querySelector('.App-module_top__SBeSV.css-2yv69u');
  const container = parentElement?.querySelector('.css-6qnjre');
  if (container) {
    const newButton = iframeDocument.createElement('button');
    newButton.classList.add('css-9c2fhu');
    newButton.title = 'Polymer List';

    // Apply styles directly - different ketcher version has differnet style to the button ie 2.24.0
    newButton.style.backgroundColor = 'transparent';
    newButton.style.border = '0';

    // Set the SVG as the innerHTML of the button
    newButton.innerHTML = PolymerShapes;
    container.appendChild(newButton);
  }
};

const rescaleToolBarButoon = (iframeDocument) => {
  const parentElement = iframeDocument.querySelector('.App-module_top__SBeSV.css-2yv69u');
  const container = parentElement?.querySelector('.css-6qnjre');
  if (container) {
    const newButton = iframeDocument.createElement('button');
    newButton.classList.add('css-9c2fhu');
    newButton.title = 'Rescale Polymer Canvas';

    // Apply styles directly - different ketcher version has differnet style to the button ie 2.24.0
    newButton.style.backgroundColor = 'transparent';
    newButton.style.border = '0';

    // Set the SVG as the innerHTML of the button
    newButton.innerHTML = RescaleCanvas;
    container.appendChild(newButton);
  }
};
export { PolymerListModal, PolymerListIconKetcherToolbarButton, rescaleToolBarButoon };

PolymerListModal.propTypes = {
  loading: PropTypes.bool,
  title: PropTypes.String,
  onCloseClick: PropTypes.func,
  onShapeSelection: PropTypes.func
};
