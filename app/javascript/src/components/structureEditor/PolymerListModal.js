/* eslint-disable max-len */
import { PropTypes } from 'mobx-react';
import React, { useState, useEffect } from 'react';
import {
  Accordion, Button, Card, Modal,
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
  Support,
  SupportSinglePhase,
  SupportSinglePhaseWhite,
  BodySolidWhite,
  SpecialCharacterPickerIcon,
  ActiveMultiNew,
  ActivePhaseNew,
  ActiveMonoNew,
  PorousBodyNew,
  SolidBodyNew,
  SolidSupportNew,
  SolidSupportMultiPhaseNew,
  SolidSupportSinglePhaseNew
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
  BodySolid,
  Support,
  SupportSinglePhase,
  SupportSinglePhaseWhite,
  BodySolidWhite,
  ActivePhaseNew,
  ActiveMonoNew,
  ActiveMultiNew,
  SolidSupportNew,
  SolidSupportMultiPhaseNew,
  SolidSupportSinglePhaseNew,
  PorousBodyNew,
  SolidBodyNew
};

function PolymerListModal({
  loading, onShapeSelection, title, onCloseClick
}) {
  const [shapesList, setShapeList] = useState([]); // Initialize the state as an empty array

  const loadTemplates = () => {
    fetch('/json/surfaceChemistryShapes.json').then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then((data) => {
      setShapeList(data);
    }).catch((error) => {
      console.error('Error fetching the JSON data:', error);
    });
  };

  useEffect(() => {
    loadTemplates();
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
        <Accordion>
          {shapesList.map((tab) => (
            <Card key={tab.id}>
              <Card.Header>
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
                                    if (shape.template_id) {
                                      onShapeSelection(shape.template_id);
                                    }
                                  }}
                                >
                                  <div className='flex flex-col items-center gap-2'>
                                    <PolymerIcon />
                                    <p className="fw-400">
                                      {shape.name}
                                    </p>
                                  </div>
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

    newButton.style.backgroundColor = 'transparent';
    newButton.style.border = '0';

    newButton.innerHTML = PolymerShapes;
    container.appendChild(newButton);
  }
};

const specialCharButton = (iframeDocument) => {
  const parentElement = iframeDocument.querySelector('.BottomToolbar-module_group__b-pGt');
  if (parentElement) {
    const newButton = iframeDocument.createElement('button');
    newButton.classList.add('ActionButton-module_button__nfoWQ');
    newButton.classList.add('textNodeChar');
    newButton.title = 'Text Node Special Char';

    newButton.style.backgroundColor = 'transparent';
    newButton.style.border = '0';

    // Set the SVG as the innerHTML of the button
    newButton.innerHTML = SpecialCharacterPickerIcon;
    parentElement.appendChild(newButton);
  }
};

function SpecialCharModal({
  loading,
  title,
  onCloseClick,
  dashedSelection,
  restSelection,
  onDashedSelection,
  onRestSelections
}) {
  const specialCharacters = [
    '!', '@', '#', '$',
    '/', '?', '∆', '★'
  ];

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
        <div className="flex flex-col flex-1 gap-4">
          <div className="flex-1 bg-gray-100 p-4 border border-gray-300 rounded-lg shadow-md max-w-xl ">
            <h4>Standard bonds</h4>
            <div className="flex-row flex-wrap gap-2" style={{ display: 'flex' }}>
              {
                specialCharacters.map((item) => (
                  <Button
                    key={item}
                    className={`w-10 h-10 text-lg font-medium border rounded-md hover:bg-gray-200 text-gray-800 shadow-sm flex items-center justify-center ${restSelection === item ? 'bg-green-200' : 'bg-white'}`}
                    onClick={() => onRestSelections(item)}
                  >
                    {item}
                  </Button>
                ))
              }
            </div>
          </div>
          <div className="flex-1 bg-gray-100  p-4 border border-gray-300 rounded-lg shadow-md max-w-xl">
            <h4>Dashed-bonds</h4>
            <div className="flex-row flex-wrap gap-2" style={{ display: 'flex' }}>
              {
                specialCharacters.map((item) => (
                  <Button
                    key={item}
                    className={`w-10 h-10 text-lg font-medium border rounded-md hover:bg-gray-200 text-gray-800 shadow-sm flex items-center justify-center ${dashedSelection === item ? 'bg-green-200' : 'bg-white'}`}
                    onClick={() => onDashedSelection(item)}
                  >
                    {item}
                  </Button>
                ))
              }
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export {
  PolymerListModal, PolymerListIconKetcherToolbarButton, specialCharButton, SpecialCharModal
};

PolymerListModal.propTypes = {
  loading: PropTypes.bool,
  title: PropTypes.String,
  onCloseClick: PropTypes.func,
  onShapeSelection: PropTypes.func
};
