import PropTypes from 'prop-types';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ControlLabel,
  Modal,
  OverlayTrigger,
  Panel,
  Tooltip,
} from 'react-bootstrap';
import CommonTemplateItem from 'src/components/ketcher-templates/CommonTemplateItem';

const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
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
      const filtered = options.filter((item) =>
        item.name.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredOptions(filtered);
    }, 300),
    [options]
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

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
        {selectedItem ? selectedItem?.name : 'Select Template'}
        <div className="select-template-badge">
          <i className="fa fa-caret-down" />
        </div>
      </div>

      <Modal show={commonTemplateModal} onHide={() => setCommonTemplateModal(false)}>
        <Modal.Header closeButton >
          {toolTip}
        </Modal.Header>
        <Modal.Body>
          <Panel style={{ height: 300 }}>
            <Panel.Heading>
              <Panel.Title>
                Common Template list:
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body style={{ height: '80%', overflow: 'auto' }}>
              <div>
                <input
                  type="text"
                  placeholder="Search templates by Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='common-template-search'
                />
                {filteredOptions.length != options.length &&
                  <div style={{ marginVertical: '10px' }}>
                    {filteredOptions.length} out of {options.length} templates found
                  </div>
                }
                {filteredOptions.map((item, idx) => (
                  <CommonTemplateItem key={idx} item={item} onClickItem={(value) => onSelectItem(value)} />
                ))}
              </div>
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    </div>
  );
});

export default CommonTemplatesList;

CommonTemplatesList.propTypes = {
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClickHandle: PropTypes.func.isRequired,
  selectedItem: PropTypes.string.isRequired,
};
