import React, { useState, useEffect } from 'react';
import { Button, ButtonToolbar, Panel } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import AdvancedSearchRow from './AdvancedSearchRow';

const AdvancedSearchForm = ({ handleCancel, currentState }) => {
  const defaultSelections = [{
    link: '',
    match: '=',
    field: {
      table: 'samples',
      column: 'name',
      label: 'Sample Name',
    },
    value: ''
  }];

  const [selectedOptions, setSelectedOptions] = useState(defaultSelections);
  const [openSearch, setOpenSearch] = useState(true);
  const [openResult, setOpenResult] = useState(false);

  useEffect(() => {
    const length = selectedOptions.length - 1;
    const selection = selectedOptions[length];

    const checkSelectedElements =
      (selection.field && selection.value && selection.link) ||
      (length == 0 && selection.field && selection.value);

    if (checkSelectedElements) {
      selectedOptions.push({ link: 'OR', match: 'LIKE', field: '', value: '' });
      setSelectedOptions((a) => [...a]);
    }
  }, [selectedOptions, setSelectedOptions]);

  const handleSave = () => {
    const uiState = currentState;
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;

    // Remove invalid filter
    const filters = selectedOptions.filter((f, id) => {
      return (f.field && f.link && f.value) ||
        (id == 0 && f.field && f.value)
    });

    const selection = {
      elementType: 'all',
      advanced_params: filters,
      search_by_method: 'advanced',
      page_size: uiState.number_of_results
    };

    // UIActions.setSearchSelection(selection);
    ElementActions.fetchSearchSelectionAndCollection({
      selection,
      collectionId: collectionId,
      isSync: uiState.isSync
    });

  }

  const renderDynamicRow = () => {
    let dynamicRow = ( <span /> );

    if (selectedOptions.length > 1) {
      let addedSelections = selectedOptions.filter((val, idx) => idx > 0);

      dynamicRow = addedSelections.map((selection, idx) => {
        let id = idx + 1;
        return (
          <AdvancedSearchRow
            idx={id}
            selection={selection}
            key={"selection_" + id}
            onChange={handleChangeSelection}
          />
        );
      });
    }

    return dynamicRow;
  };

  const handleChangeSelection = (idx, formElement) => (e) => {
    let value = formElement == 'value' ? e.target.value : (formElement == 'field' ? e.value : e);
    selectedOptions[idx][formElement] = value;
    setSelectedOptions((a) => [...a]);
  }

  return (
    <>
      <Panel id="collapsible-search" className="collapsible-search-result" onToggle={() => setOpenSearch(!openSearch)} expanded={openSearch}>
        <Panel.Heading>
          <Panel.Title toggle>
            Search
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <div className="advanced-search">
              <div>
                <AdvancedSearchRow
                  idx={0}
                  selection={selectedOptions[0]}
                  key={"selection_0"}
                  onChange={handleChangeSelection}
                />
                {renderDynamicRow()}
              </div>
            </div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={handleCancel}>
                Cancel
              </Button>
              <Button bsStyle="primary" onClick={handleSave} style={{ marginRight: '20px' }} >
                Search
              </Button>
            </ButtonToolbar>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel id="collapsible-result" className="collapsible-search-result inactive" onToggle={() => setOpenResult(!openResult)} expanded={openResult}>
        <Panel.Heading>
          <Panel.Title toggle>
            Result
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            Result
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default AdvancedSearchForm;
