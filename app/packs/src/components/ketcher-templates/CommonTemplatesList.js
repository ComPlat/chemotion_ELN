/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/prop-types */
import { uniqueId } from 'lodash';
import React, { useState } from 'react';
import {
  Modal,
  Panel,
  ControlLabel,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';

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
        onClick={() => setCommonTemplateModal(true)}
      >
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
              {options.map((item) => <TemplateItem key={uniqueId} item={item} onClickItem={(value) => onSelectItem(value)} />)}
            </Panel.Body>
          </Panel>
        </Modal.Body>
        {/* <Modal.Footer>
          <Button variant="secondary" onClick={() => setCommonTemplateModal(false)}>
            Cancel
          </Button>
        </Modal.Footer> */}
      </Modal>
    </div>
  );
}

function TemplateItem(props) {
  const { item, onClickItem } = props;
  let iconPath = '/images/ketcherails/icons/small/';
  if (item?.icon) iconPath += item.icon.split('/')[3];

  return (
    <div className="ketcher-template-item" onClick={() => onClickItem(item)}>
      <img src={iconPath} height={80} alt={item?.name} />
      <h4 style={{ marginLeft: 15 }}>
        {' '}
        {item?.name}
        {' '}
      </h4>
    </div>
  );
}

export default CommonTemplatesList;
