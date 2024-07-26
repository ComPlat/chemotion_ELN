import React, { useState } from 'react';
import {
  Modal,
  Panel,
  ControlLabel,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import CommonTemplateItem from 'src/components/ketcher-templates/CommonTemplateItem';

function CommonTemplatesList({ options, onClickHandle, selectedItem }) {
  const [commonTemplateModal, setCommonTemplateModal] = useState(false);
  const toolTip = 'Select a template and Press CTRL + v inside the canvas.';

  const onSelectItem = (item) => {
    onClickHandle(item);
    setCommonTemplateModal(false);
  };

  return (
    <div>
      <div className="common-template-header">
        <div style={{ width: '95%' }}>
          <ControlLabel>Common Templates:</ControlLabel>
        </div>
        <OverlayTrigger placement="top" overlay={<Tooltip id="commontemplates">{toolTip}</Tooltip>}>
          <i className="fa fa-info" />
        </OverlayTrigger>
      </div>
      <div
        className="ketcher-select-common-template"
        onClick={() => setCommonTemplateModal(true)}>
        {selectedItem ? selectedItem.name : 'Select Template'}
        <div className="select-template-badge">
          <i className="fa fa-caret-down" />
        </div>
      </div>

      <Modal show={commonTemplateModal} onHide={() => setCommonTemplateModal(false)}>
        <Modal.Header closeButton />
        <Modal.Body>
          <Panel>
            <Panel.Heading>
              <Panel.Title>
                Common Template list:
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              {options.map((item, idx) => <CommonTemplateItem key={idx} item={item} onClickItem={(value) => onSelectItem(value)} />)}
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CommonTemplatesList;
