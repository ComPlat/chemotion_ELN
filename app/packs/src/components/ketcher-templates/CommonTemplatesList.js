import PropTypes from 'prop-types';
import React, {memo, useState} from 'react';
import {
  Modal,
  Form,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import CommonTemplateItem from 'src/components/ketcher-templates/CommonTemplateItem';

const CommonTemplatesList = memo(({options, onClickHandle, selectedItem}) => {
  const [commonTemplateModal, setCommonTemplateModal] = useState(false);
  const toolTip = 'Select a template and Press CTRL + v inside the canvas.';

  const onSelectItem = (item) => {
    onClickHandle(item);
    setCommonTemplateModal(false);
  };

  return (
    <div>
      <div className="common-template-header">
        <div style={{width: '95%'}}>
          <Form.Label>Common Templates:</Form.Label>
        </div>
        <OverlayTrigger placement="top" overlay={<Tooltip id="commontemplates">{toolTip}</Tooltip>}>
          <i className="fa fa-info" />
        </OverlayTrigger>
      </div>
      <div
        className="ketcher-select-common-template"
        onClick={() => setCommonTemplateModal(true)}
      >
        {selectedItem ? selectedItem?.name : 'Select Template'}
        <div className="select-template-badge">
          <i className="fa fa-caret-down" />
        </div>
      </div>

      <Modal show={commonTemplateModal} onHide={() => setCommonTemplateModal(false)}>
        <Modal.Header closeButton>
          Common Template list:
        </Modal.Header>
        <Modal.Body>
          {options.map((item, idx) =>
            <CommonTemplateItem key={idx} item={item} onClickItem={(value) => onSelectItem(value)} />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
});

export default CommonTemplatesList;

CommonTemplatesList.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClickHandle: PropTypes.func.isRequired,
  selectedItem: PropTypes.string.isRequired
};
