import React, {useState} from 'react';
import {
  Modal,
  Panel,
  FormGroup,
  ControlLabel,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import {Accordion, AccordionItem} from '@szhsin/react-accordion';
import SurfaceChemistryItemThumbnail from 'src/components/ketcher-templates/SurfaceChemistryItemThumbnail';
import PropTypes from 'prop-types';

const basicShapeKetcherFormat = {
  root: {
    nodes: [
      {
        "type": "image",
        "format": "image/svg+xml",
        "boundingBox": {
          "x": 7.400000000000077,
          "y": -3.324999999999994,
          "z": 0,
          "width": 1,
          "height": 1
        },
        "data": ''
      }
    ],
    connections: [

    ],
    templates: [

    ]
  }
};

const shapesList = {
  'Active Phase': {
    'Round Mono': {
      Filling: 'solid',
      Color: 'Variations of Blue',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzQ0NzJjNCIgc3Ryb2tlPSIjMzE1MzhmIiBzdHJva2Utd2lkdGg9IjMiIC8+Cjwvc3ZnPgo='

    },
    'Round Multi': {
      Filling: 'hatched',
      Color: 'Variations of Blue',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibHVlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUsNSIgLz4KPC9zdmc+Cg=='
    },
    'Round Promotors': {
      Filling: 'solid, smaller size',
      Color: 'Variations of Red',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0iI2VkN2QzMSIgc3Ryb2tlPSIjYWM1YjIzIiBzdHJva2Utd2lkdGg9IjMiIC8+PC9zdmc+'
    },
    'Round Full Coating': {
      Filling: 'selection of colors',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InVybCgjZ3JhZGllbnQpIiAvPg0KICA8ZGVmcz4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOmJsdWU7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJlZDtzdG9wLW9wYWNpdHk6MSIgLz4NCiAgICA8L2xpbmVhckdyYWRpZW50Pg0KICA8L2RlZnM+DQo8L3N2Zz4=',
    }
  },
  Support: {
    'Rectangle Support': {
      Filling: 'Solid',
      Color: 'Variations of Yellow',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZmZjMDAwIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgLz4NCjwvc3ZnPg0K'
    },
    'Rectangle Phase separated Supports': {
      Filling: 'solid, divided',
      Color: 'Variations of Yellow',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgLz4NCjwvc3ZnPg0K',
    },
    'Rectangle Mixed Supports': {
      Filling: 'hatched',
      Color: 'Variations of Yellow',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+DQo8L3N2Zz4=',
    }
  },
  'Layer Rectangle with round edges': {
    Catalyst: {
      Filling: 'Draft',
      Color: 'selection of colors',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIzMCIgcng9IjEwIiByeT0iMTAiIGZpbGw9InVybCgjZ3JhZGllbnQpIiAvPg0KICA8ZGVmcz4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOmdyZWVuO3N0b3Atb3BhY2l0eToxIiAvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjp5ZWxsb3c7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9saW5lYXJHcmFkaWVudD4NCiAgPC9kZWZzPg0KPC9zdmc+',
    }
  },
  Body: {
    'Rectangle Solid': {
      Filling: 'Solid',
      Color: 'Variations of Grey',
      icon: 'Cjxzdmcgd2lkdGg9IjEwMCIgaGVpZ2h0PSI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiM3NTcwNzAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIzIiAvPgo8L3N2Zz4=',
    },
    'Rectangle hatched': {
      Filling: 'hatched',
      Color: 'Variations of Grey',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIzIiAgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjwvc3ZnPg=='
    },
    'Rectangle Porous': {
      Filling: 'Solid',
      Color: 'Variations of white',
      icon: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjMiIC8+Cjwvc3ZnPg==',
    }
  }
};

const SurfaceChemistryList = (props) => {
  const [showSurfaceChemModal, setShowSurfaceChemModal] = useState(false);
  const {onSelectShape, selectedShape} = props;
  const toolTip = 'Select a template and Press CTRL + v inside the canvas.';

  const onShapeSelection = (item, obj) => {
    basicShapeKetcherFormat.root.nodes[0].data = `${obj.icon}`;
    onSelectShape({
      ...basicShapeKetcherFormat,
      ...obj,
      name: `${item} ${obj.Filling} ${obj.Color}`
    });
    setShowSurfaceChemModal(false);
  };
  return (
    <FormGroup>
      <div className="common-template-header">
        <div style={{width: '95%'}}>
          <ControlLabel>Shapes:</ControlLabel>
        </div>
        <OverlayTrigger placement="top" overlay={<Tooltip id="commontemplates">{toolTip}</Tooltip>}>
          <i className="fa fa-info" />
        </OverlayTrigger>
      </div>
      <div
        className="ketcher-select-common-template"
        onClick={() => setShowSurfaceChemModal(true)}
      >
        {selectedShape ? `${selectedShape?.name.slice(0, 15)}...` : 'Select shape'}
        <div className="select-template-badge">
          <i className="fa fa-caret-down" />
        </div>
      </div>
      <div>
        <Modal show={showSurfaceChemModal} onHide={() => setShowSurfaceChemModal(false)}>
          <Modal.Header closeButton />
          <Modal.Body>
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  Surface Chemistry shapes:
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                {
                  Object.keys(shapesList).map((item, idx) => (
                    <Accordion key={idx}>
                      <div style={{position: 'relative'}} className="surface-chem-accordian-heading">
                        <AccordionItem header={item}>
                          <div className="shapes-accordionItem">
                            {
                              Object.keys(shapesList[item]).map((subItem, subIdx) => {
                                const obj = shapesList[item][subItem];
                                return (
                                  <SurfaceChemistryItemThumbnail
                                    key={subIdx}
                                    icon={obj.icon}
                                    title={`${item} ${obj.Filling}`}
                                    onClickHandle={() => onShapeSelection(item, obj)}

                                  />
                                );
                              })
                            }
                          </div>

                        </AccordionItem>
                      </div>
                    </Accordion>
                  ))
                }
              </Panel.Body>
            </Panel>
          </Modal.Body>
        </Modal>
      </div>

    </FormGroup>
  );
};

export default SurfaceChemistryList;
SurfaceChemistryList.propTypes = {
  onSelectShape: PropTypes.func.isRequired,
  selectedShape: PropTypes.string.isRequired
};
