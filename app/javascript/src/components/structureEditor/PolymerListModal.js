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
  RescaleCanvas,
  Support,
  SupportSinglePhase,
  SupportSinglePhaseWhite,
  BodySolidWhite,
  SpecialCharacterPickerIcon
} from 'src/components/structureEditor/TemplatesSurfaceChemistry';
import {
  textList,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
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
  BodySolidWhite
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
                                    if (shape.template_id) {
                                      onShapeSelection(shape.template_id);
                                    }
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

const rescaleToolBarButton = (iframeDocument) => {
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

const specialCharButton = (iframeDocument) => {
  const parentElement = iframeDocument.querySelector('.BottomToolbar-module_group__b-pGt');
  if (parentElement) {
    const newButton = iframeDocument.createElement('button');
    newButton.classList.add('ActionButton-module_button__nfoWQ');
    newButton.classList.add('textNodeChar');
    newButton.title = 'Text Node Special Char';

    // Apply styles directly - different ketcher version has differnet style to the button ie 2.24.0
    newButton.style.backgroundColor = 'transparent';
    newButton.style.border = '0';

    // Set the SVG as the innerHTML of the button
    newButton.innerHTML = SpecialCharacterPickerIcon;
    parentElement.appendChild(newButton);
  }
};

function SpecialCharModal({
  loading, onSelection, title, onCloseClick

}) {
  const specialCharacters = [
    '!', '@', '#', '$', '%', '^',
    '&', '*', '-', '_', '=', '+', '\\',
    '|', ';', ':', ',', '.', '<', '>',
    '/', '?', '`', '~', '•', '—', '≠',
    '≈', '√', '∫', '∑', '∆', '←', '↑',
    '→', '↓', '★'
  ];

  const stored = JSON.parse(localStorage.getItem('ketcher-opts'));
  // const prepareTextListDemoConnected = () => {
  //   let stringConnected = '';
  //   const separator = stored?.textNodeSeparator || '/';
  //   for (let i = 0; i < textList.length; i++) {
  //     const text = textList[i];
  //     const content = JSON.parse(text.data.content); // Parse content
  //     console.log(content);
  //     stringConnected += content.blocks[0].text + separator;
  //   }
  //   return stringConnected;
  // };

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
        <div className="flex-1 flex-row flex-wrap gap-2 p-4 bg-gray-100 border border-gray-300 rounded-lg shadow-md max-w-xl" style={{ display: 'flex' }}>
          {
            specialCharacters.map((item) => (
              <Button
                key={item}
                className={`w-10 h-10 text-lg font-medium border rounded-md hover:bg-gray-200 text-gray-800 shadow-sm flex items-center justify-center ${stored?.textNodeSeparator === item ? 'bg-green-200' : 'bg-white'
                }`}
                onClick={() => onSelection(item)}
              >
                {item}
              </Button>
            ))
          }
        </div>
      </Modal.Body>
    </Modal>
  );
}

export {
  PolymerListModal, PolymerListIconKetcherToolbarButton, rescaleToolBarButton, specialCharButton, SpecialCharModal
};

PolymerListModal.propTypes = {
  loading: PropTypes.bool,
  title: PropTypes.String,
  onCloseClick: PropTypes.func,
  onShapeSelection: PropTypes.func
};
