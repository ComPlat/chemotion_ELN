/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable max-len */
import React, { useState } from 'react';
import {
  Modal,
  Panel,
  FormGroup,
  ControlLabel,
  OverlayTrigger,
  Tooltip,
  Image,
} from 'react-bootstrap';
import { Accordion, AccordionItem } from '@szhsin/react-accordion';
import { uniqueId } from 'lodash';

const basicShapeKetcherFormat = {
  root: {
    nodes: [
      {
        type: 'rasterImage',
        center: {
          x: 58.7833333333333,
          y: -142.38015873015874,
          z: 0
        },
        data: {
          bitmap: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IS0tIFVwbG9hZGVkIHRvOiBTVkcgUmVwbywgd3d3LnN2Z3JlcG8uY29tLCBHZW5lcmF0b3I6IFNWRyBSZXBvIE1peGVyIFRvb2xzIC0tPg0KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxwYXRoIGQ9Ik03LjUgMTFWMTNNMTMuNSA4VjE2TTEwLjUgMTBWMTRNMTYuNSAxMC41VjEzLjVNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45NzA2IDMgMTJDMyA3LjAyOTQ0IDcuMDI5NDQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQ0IDIxIDEyWiIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPg0KPC9zdmc+',
          halfSize: {
            x: 58.7833333333333,
            y: -142.38015873015874,
            z: 0
          },
          position: [
            {
              x: -52.2166666666667,
              y: -89.00515873015873,
              z: 0
            }

          ]
        }
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

function SurfaceChemistryList(props) {
  const [showSurfaceChemModal, setShowSurfaceChemModal] = useState(false);
  const { onSelectShape, selectedShape } = props;
  const toolTip = 'Select a template and Press CTRL + v inside the canvas.';

  return (
    <FormGroup>
      <div className="common-template-header">
        <div style={{ width: '95%' }}>
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
        {selectedShape ? `${selectedShape?.name.slice(0, 18)}...` : 'Select shape'}
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
                  Object.keys(shapesList).map((item) => (
                    <Accordion key={uniqueId}>
                      <div style={{ position: 'relative' }} className="surface-chem-accordian-heading">
                        <AccordionItem header={item}>
                          <div className="shapes-accordionItem">
                            {
                              Object.keys(shapesList[item]).map((subItem) => {
                                const obj = shapesList[item][subItem];
                                return (
                                  <SurfaceChemistryItemThumbnail
                                    key={uniqueId}
                                    icon={obj.icon}
                                    title={`${item} ${obj.Filling}`}
                                    onClickHandle={() => {
                                      basicShapeKetcherFormat.root.nodes[0].data.bitmap = `data:image/svg+xml;base64,${obj.icon}`;
                                      onSelectShape({
                                        ...basicShapeKetcherFormat,
                                        ...obj,
                                        name: `${item} ${obj.Filling} ${obj.Color}`
                                      });
                                      setShowSurfaceChemModal(false);
                                    }}
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
}

function SurfaceChemistryItemThumbnail({
  item, icon, title, onClickHandle
}) {
  return (
    <div className="surface-chem-shape" onClick={() => onClickHandle(item)}>
      <div className="surface-thumbnail-container">
        <Image src={`data:image/svg+xml;base64,${icon}`} thumbnail height={30} width={80} />
      </div>
      <h4>{title}</h4>
    </div>
  );
}
export default SurfaceChemistryList;
