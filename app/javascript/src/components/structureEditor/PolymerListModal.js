/* eslint-disable max-len */
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import {
  Accordion, Button, ButtonGroup, Card, Form, Spinner
} from 'react-bootstrap';

const PolymerShapes = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <!-- Square with border -->
  <rect x="4" y="4" width="8" height="8" stroke="black" stroke-width="2" fill="none" />
  
  <!-- Circle with border -->
  <circle cx="18" cy="18" r="4" stroke="black" stroke-width="2" fill="none" />
</svg>
`;

const SpecialCharacterPickerIcon = `
<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C7.03 2 3 6.03 3 11H5C5 7.134 8.134 4 12 4C15.866 4 19 7.134 19 11C19 14.866 15.866 18 12 18C10.673 18 9.402 17.597 8.343 16.828L7 18.172C8.645 19.421 10.735 20 12.999 20C17.97 20 22 15.97 22 11C22 6.03 17.97 2 12 2Z" fill="currentColor"/>
</svg>
`;

function PolymerListModal({
  loading, onShapeSelection, title, onCloseClick
}) {
  const [shapesList, setShapeList] = useState([]); // Initialize the state as an empty array
  const [category, setCategory] = useState(() => localStorage.getItem('polymerCategory') || 'basic');
  const [loadingData, setLoadingData] = useState(false); // Initialize the state as an empty array

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
    })
      .finally(() => {
        setTimeout(() => {
          setLoadingData(false);
        }, 200);
      });
  };

  useEffect(() => {
    setLoadingData(true);
    loadTemplates();
  }, [category]);

  const onCategoryChange = (categoryAlias) => {
    setCategory(categoryAlias);
    setLoadingData(true);
    localStorage.setItem('polymerCategory', categoryAlias);
  };

  // Keep the panel permanently mounted (never return null). This ensures <img>
  // elements are created at page-load time — before the Ketcher canvas has any
  // content — so no new image loading occurs when the user opens the panel later.
  // Toggling `display` is zero-cost: no DOM creation, no network requests, no reflow.
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        zIndex: 10000,
        minWidth: 480,
        maxWidth: 600,
        maxHeight: '80vh',
        display: loading ? 'flex' : 'none',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #eee',
      }}>
        <strong>{title}</strong>
        <button
          type="button"
          onClick={onCloseClick}
          style={{
            background: 'none', border: 'none', fontSize: 18,
            cursor: 'pointer', lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
        <Form.Group className="w-100 d-flex justify-content-end align-items-center mb-3">
          <ButtonGroup className="w-100" aria-label="Category switch">
            {shapesList && Object.keys(shapesList).map((categoryItem) => {
              const isActive = category === categoryItem;
              return (
                <Button
                  key={categoryItem}
                  variant="light"
                  active={isActive}
                  className="flex-fill text-capitalize"
                  onClick={() => onCategoryChange(categoryItem)}
                >
                  {categoryItem}
                </Button>
              );
            })}
          </ButtonGroup>
        </Form.Group>

        <Accordion>
          {loadingData ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '180px' }}>
              <Spinner animation="border" role="status" style={{ color: '#167782' }}>
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : shapesList && shapesList[category]?.map((tab) => (
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
                            {subTab?.shapes?.map((shape) => (
                              <Button
                                key={shape.template_id}
                                variant="normal"
                                onClick={async () => {
                                  if (shape.template_id) {
                                    onShapeSelection(shape.template_id, true);
                                  }
                                }}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <img
                                    src={`/polymerShapes/${category}/${shape.iconName}.svg`}
                                    alt={shape.label || 'shape'}
                                    title={shape.label || 'shape'}
                                    style={{ width: 40, height: 40, objectFit: 'contain' }}
                                  />
                                </div>
                              </Button>
                            ))}
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
      </div>
    </div>
  );
}

const PolymerListIconKetcherToolbarButton = (iframeDocument) => {
  const parentElement = iframeDocument.querySelector('.App-module_top__SBeSV.css-2yv69u');
  const container = parentElement?.querySelector('.css-6qnjre');
  if (container) {
    // Add left border separator
    const leftBorder = iframeDocument.createElement('span');
    leftBorder.classList.add('css-2ssukb');
    leftBorder.style.borderWidth = '0px 0px 0px thin';
    container.appendChild(leftBorder);

    const newButton = iframeDocument.createElement('button');
    newButton.classList.add('css-173yjn8');
    newButton.title = 'Solid Surface Templates';

    const svgWithClass = PolymerShapes.replace('fill="none">', 'fill="none" class="css-2ntgcm">');
    newButton.innerHTML = svgWithClass;
    container.appendChild(newButton);
  }
};

const SolidSurfaceTemplatesIconTextButton = (iframeDocument) => {
  const parentElement = iframeDocument.querySelector('.App-module_top__SBeSV.css-2yv69u');
  const container = parentElement?.querySelector('.css-6qnjre');
  if (container) {
    const newButton = iframeDocument.createElement('button');
    newButton.classList.add('css-173yjn8');
    newButton.title = 'Add Label';

    const bigTSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="css-2ntgcm"><path d="M18 6H6v3.357h1.714V7.714h3.429v9.429h-1.5v1.714h4.714v-1.714h-1.5V7.714h3.429v1.643H18V6z" fill="currentColor"></path></svg>';
    newButton.innerHTML = bigTSVG;
    container.appendChild(newButton);

    // Add right border separator
    const rightBorder = iframeDocument.createElement('span');
    rightBorder.classList.add('css-2ssukb');
    container.appendChild(rightBorder);
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
    <AppModal
      title={title}
      dialogClassName="w-500 h-500"
      className="top-50 start-50 translate-middle"
      style={{ zIndex: '10000' }}
      show={loading}
      onHide={onCloseClick}
      showFooter={false}
    >
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
    </AppModal>
  );
}

SpecialCharModal.propTypes = {
  loading: PropTypes.bool,
  title: PropTypes.string,
  onCloseClick: PropTypes.func,
  dashedSelection: PropTypes.string,
  restSelection: PropTypes.string,
  onDashedSelection: PropTypes.func,
  onRestSelections: PropTypes.func,
};

SpecialCharModal.defaultProps = {
  loading: false,
  title: 'Text Node Special Characters',
  onCloseClick: () => {},
  dashedSelection: null,
  restSelection: null,
  onDashedSelection: () => {},
  onRestSelections: () => {},
};

export {
  PolymerListModal, PolymerListIconKetcherToolbarButton, specialCharButton, SpecialCharModal, SolidSurfaceTemplatesIconTextButton
};

PolymerListModal.propTypes = {
  loading: PropTypes.bool,
  title: PropTypes.string,
  onCloseClick: PropTypes.func,
  onShapeSelection: PropTypes.func,
};

PolymerListModal.defaultProps = {
  loading: false,
  title: 'Surface Chemistry Templates',
  onCloseClick: () => {},
  onShapeSelection: () => {},
};
