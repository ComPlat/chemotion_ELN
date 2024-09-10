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

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const CommonTemplatesList = memo(({ options, onClickHandle, selectedItem }) => {
  const [commonTemplateModal, setCommonTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const toolTip = 'Select a template. Clicking inside the canvas and Press CTRL + v.';

  const onSelectItem = (item) => {
    onClickHandle(item);
    setCommonTemplateModal(false);
  };

  const handleSearch = useCallback(
    debounce((query) => {
      const lowerCaseQuery = query.toLowerCase();
      const filtered = options.filter((item) => item.name.toLowerCase().includes(lowerCaseQuery));
      setFilteredOptions(filtered);
    }, 300),
    [options]
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
        onClick={() => setCommonTemplateModal(true)}
      >
        {selectedItem ? selectedItem?.name : 'Select Template'}
        <i className="fa fa-caret-down" />
      </Button>

      <Modal
        centered
        show={commonTemplateModal}
        onHide={() => setCommonTemplateModal(false)}
      >
        <Modal.Header closeButton>
          {toolTip}
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            placeholder="Search templates by Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {filteredOptions.length != options.length && (
            <div className="my-2">
              {`${filteredOptions.length} out of ${options.length} templates found`}
            </div>
          )}
          <Card className="mt-2">
            <Card.Body className="d-flex flex-column gap-2 overflow-y-scroll vh-50">
              {filteredOptions.map((item, idx) => (
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

export default CommonTemplatesList;

CommonTemplatesList.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClickHandle: PropTypes.func.isRequired,
  selectedItem: PropTypes.string.isRequired
};
