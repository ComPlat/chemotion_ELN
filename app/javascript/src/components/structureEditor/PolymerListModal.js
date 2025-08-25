/* eslint-disable max-len */
import { PropTypes } from 'mobx-react';
import React, { useState, useEffect } from 'react';
import {
  Accordion, Button, Card, Form, Modal, Spinner
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

function InlineSVG({ src }) {
  const [svgContent, setSvgContent] = useState(null);

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch((err) => console.error('SVG load error:', err));
  }, [src]);

  return (
    <div
      className="inline-svg"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export default InlineSVG;

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
    localStorage.setItem('polymerCategory', categoryAlias); // ✅ correct value
  };

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
        <Form.Group className="w-100 d-flex justify-content-end align-items-center mb-3">
          <div
            className="btn-group w-100"
            role="group"
            aria-label="Category switch"
            style={{ display: 'flex', gap: 0 }}
          >
            {shapesList && Object.keys(shapesList).map((categoryItem, index, arr) => {
              const isActive = category === categoryItem;
              const isFirst = index === 0;
              const isLast = index === arr.length - 1;

              return (
                <Button
                  key={categoryItem}
                  onClick={() => onCategoryChange(categoryItem)}
                  style={{
                    flex: 1,
                    backgroundColor: isActive ? '#167782' : 'transparent',
                    color: isActive ? '#fff' : '#6c757d',
                    border: isActive ? 'none' : '1px solid #ced4da',
                    textTransform: 'capitalize',
                    borderRadius: isFirst
                      ? '8px 0 0 8px'
                      : isLast
                        ? '0 8px 8px 0'
                        : '0',
                    margin: 0
                  }}
                >
                  {categoryItem}
                </Button>
              );
            })}
          </div>
        </Form.Group>

        <Accordion>
          {loadingData ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '180px' }}>
              <Spinner animation="border" role="status" variant="#167782" style={{ color: '#167782' }}>
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
                                    onShapeSelection(shape.template_id);
                                  }
                                }}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <InlineSVG src={`/polymerShapes/${category}/${shape.iconName}.svg`} />
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
