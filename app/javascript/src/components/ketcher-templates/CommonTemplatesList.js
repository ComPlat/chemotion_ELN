import PropTypes from 'prop-types';
import React, {
  memo, useCallback, useEffect, useState
} from 'react';
import {
  Modal,
  OverlayTrigger,
  Tooltip,
  Card,
  Form,
  Button,
} from 'react-bootstrap';
import TemplateFetcher from 'src/fetchers/TemplateFetcher';

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

function copyContentToClipboard(content) {
  if (navigator.clipboard) {
    const data = typeof content === 'object' ? JSON.stringify(content) : content;
    navigator.clipboard.writeText(data).then(() => {
      // alert('Please click on canvas and press CTRL+V to use the template.');
    }).catch((err) => {
      console.error('Failed to copy text: ', err);
    });
  }
}

const CommonTemplatesList = memo(() => {
  const [templateList, setTemplateList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const toolTip = 'Select a template. Clicking inside the canvas and Press CTRL + v.';

  async function fetchTemplates() {
    const templates = await TemplateFetcher.commonTemplates();
    setTemplateList(templates);
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  const onSelectItem = (item) => {
    setSelectedItem(item);
    copyContentToClipboard(item?.molfile);
    setShowModal(false);
  };

  const handleSearch = useCallback(
    debounce((query) => {
      const lowerCaseQuery = query.toLowerCase();
      const filtered = templateList?.filter((item) => item.name.toLowerCase()?.includes(lowerCaseQuery));
      setFilteredOptions(filtered);
    }, 300),
    [templateList]
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  return (
    <div className="w-25">
      <div className="d-flex align-items-baseline justify-content-between gap-2">
        <Form.Label>Common Templates:</Form.Label>
        <OverlayTrigger placement="top" overlay={<Tooltip id="commontemplates">{toolTip}</Tooltip>}>
          <i className="fa fa-info" />
        </OverlayTrigger>
      </div>
      <Button
        className="w-100 text-left d-flex justify-content-between align-items-baseline"
        variant="light"
        onClick={() => setShowModal(true)}
      >
        {selectedItem ? selectedItem?.name : 'Select Template'}
        <i className="fa fa-caret-down" />
      </Button>

      <Modal
        centered
        show={showModal}
        onHide={() => setShowModal(false)}
      >
        <Modal.Header closeButton>
          {toolTip}
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            placeholder="Search templates by Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
          />
          {filteredOptions?.length !== templateList?.length && (
            <div className="my-2">
              {`${filteredOptions?.length} out of ${templateList?.length} templates found`}
            </div>
          )}
          <Card className="mt-2">
            <Card.Body className="d-flex flex-column gap-2 overflow-y-scroll vh-50">
              {filteredOptions?.map((item, idx) => (
                <Button
                  key={idx}
                  className="d-flex gap-2 w-100 align-items-baseline"
                  variant="light"
                  onClick={() => onSelectItem(item)}
                >
                  <i className="fa fa-arrows-alt" />
                  {item?.name}
                </Button>
              ))}
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>
    </div>
  );
});
CommonTemplatesList.displayName = 'CommonTemplatesList';

export default CommonTemplatesList;