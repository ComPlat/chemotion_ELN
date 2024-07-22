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


const shapes_list = {
  "Active Phase": {
    "Round Mono": {
      "Filling": "solid",
      "Color": "Variations of Blue",
      "icon": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSI1IiByeT0iNSIgZmlsbD0iIzQ0NzJjNCIgLz48L3N2Zz4=",
      ket: 'blah blah'
    },
    "Round Multi": {
      "Filling": "hatched",
      "Color": "Variations of Blue",
      "icon": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+DQogIDxjaXJjbGUgcj0iNzUiIGN4PSI4MCIgY3k9IjgwIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0iIzQ0NzJjNCIgLz4NCjwvc3ZnPg==",
      ket: 'blah blah'
    },
    "Round Promotors": {
      "Filling": "solid, smaller size",
      "Color": "Variations of Red",
      "icon": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+DQogIDxjaXJjbGUgcj0iNzUiIGN4PSI4MCIgY3k9IjgwIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0iIzQ0NzJjNCIgLz4NCjwvc3ZnPg==",
      ket: 'blah blah'
    },
    "Round Full Coating": {
      "Filling": "selection of colors",
      "icon": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+DQogIDxjaXJjbGUgcj0iNzUiIGN4PSI4MCIgY3k9IjgwIiBzdHJva2U9IiNiYThjMDAiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0iIzQ0NzJjNCIgLz4NCjwvc3ZnPg==",
      ket: 'blah blah'
    }
  },
  "Support": {
    "Rectangle Support": {
      "Filling": "Solid",
      "Color": "Variations of Yellow",
      "icon": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSI1IiByeT0iNSIgZmlsbD0iIzQ0NzJjNCIgLz48L3N2Zz4="
    },
    "Rectangle Phase separated Supports": {
      "Filling": "solid, divided",
      "Color": "Variations of Yellow",
      "icon": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9InJnYigxNTUsIDE5MiwwKSIgc3Ryb2tlPSJyZ2IoMTg2LDE0MCwwKSIgc3Ryb2tlLXdpZHRoPSIzIiAvPjwvc3ZnPg==",
      ket: 'blah blah'
    },
    "Rectangle Mixed Supports": {
      "Filling": "hatched",
      "Color": "Variations of Yellow",
      "icon": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9InJnYigxNTUsIDE1NSwwKSIgc3Ryb2tlPSJyZ2IoMTg2LDE0MCwwKSIgc3Ryb2tlLXdpZHRoPSIzIiAvPjwvc3ZnPg==",
      ket: 'blah blah'
    }
  },
  "Layer Rectangle with round edges": {
    "Catalyst": {
      "Color": "selection of colors",
      "icon": "PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3Lnd3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjI1IiBjeT0iMjUiIHI9IjI1IiBmaWxsPSIjZWQ3ZDMxIiBzdHJva2U9IiNhYzViMjMiIHN0cm9rZS13aWR0aD0iMyIgLz48L3N2Zz4=",
      ket: 'blah blah'
    }
  },
  "Body": {
    "Rectangle Solid": {
      "Filling": "Solid",
      "Color": "Variations of Grey",
      "icon": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSI1IiByeT0iNSIgZmlsbD0iI2ZmZiIgIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIzIiAvPjwvc3ZnPg==",
      ket: 'blah blah'
    },
    "Rectangle Porous": {
      "Filling": "hatched",
      "Color": "Variations of Grey",
      "icon": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9InJnYigxNTUsIDE1NSwwKSIgc3Ryb2tlPSJyZ2IoMTg2LDE0MCwwKSIgc3Ryb2tlLXdpZHRoPSIzIiAvPjwvc3ZnPg==",
      ket: 'blah blah'
    }
  }
};

function SurfaceChemistryList(props) {
  const [showSurfaceChemModal, setShowSurfaceChemModal] = useState(false);
  const { onSelectShape, selectedShape } = props;
  console.log(selectedShape);

  const toolTip = `Select a template and Pres CTRL + v inside the canvas.`;

  return (
    <FormGroup>
      <div className='common-template-header'>
        <div style={{ width: '95%' }}>
          <ControlLabel>Shapes:</ControlLabel>
        </div>
        <OverlayTrigger placement="top" overlay={<Tooltip id="commontemplates">{toolTip}</Tooltip>}>
          <i className="fa fa-info" />
        </OverlayTrigger>
      </div>
      <div
        className='ketcher-select-common-template'
        onClick={() => setShowSurfaceChemModal(true)}
      >
        {selectedShape ? selectedShape?.Filling : 'Select shape'}
        <div className='select-template-badge'>
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
                  Object.keys(shapes_list).map((item, idx) => {
                    return (
                      <Accordion>
                        <div style={{ position: 'relative' }} className={"surface-chem-accordian-heading"}>
                          <AccordionItem header={item}  >
                            <div className={"shapes-accordionItem"}>
                              {
                                Object.keys(shapes_list[item]).map((sub_item, sub_idx) => {
                                  const obj = shapes_list[item][sub_item];
                                  return (
                                    <SurfaceChemistryItemThumbnail
                                      icon={obj.icon} title={`${item} ${obj.Filling}`}
                                      onClickHandle={() => {
                                        onSelectShape(obj);
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
                    );
                  })
                }
              </Panel.Body>
            </Panel>
          </Modal.Body>
        </Modal>
      </div>


    </FormGroup >
  );
}

function SurfaceChemistryItemThumbnail({ item, icon, title, onClickHandle }) {
  return (
    <div className='suraface-chem-shape' onClick={() => onClickHandle(item)}>
      <div className='surface-thumbnail-container'>
        <Image src={"data:image/svg+xml;base64," + icon} thumbnail height={30} width={80} />
      </div>
      <h4>{title}</h4>
    </div>
  );
}
export default SurfaceChemistryList;