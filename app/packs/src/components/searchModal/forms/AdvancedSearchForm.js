import React, { useState, useEffect } from 'react';
import {Button, FormControl} from 'react-bootstrap'
import Select from 'react-select';
import AdvancedSearchRow from './AdvancedSearchRow';

const AdvancedSearchForm = () => {
  const defaultSelections = [{
    combination: '',
    mapper: {
      value: "=",
      label: "EXACT"
    },
    field: {
      table: 'samples',
      column: 'name',
      label: 'Sample Name',
    },
    textarea: ''
  }];

  const [selectedOptions, setSelectedOptions] = useState(defaultSelections);

  useEffect(() => {
    const length = selectedOptions.length - 1;
    const selection = selectedOptions[length];

    const checkSelectedElements =
      (selection.field && selection.textarea && selection.combination) ||
      (length == 0 && selection.field && selection.textarea);

    if (checkSelectedElements) {
      selectedOptions.push({ combination: 'OR', mapper: '', field: '', textarea: '' });
      setSelectedOptions((a) => [...a]);
    }
  }, [selectedOptions, setSelectedOptions, renderDynamicRow]);

  //const advancedSearch = (filters) => {
  //  const uiState = UIStore.getState();
  //  const selection = {
  //    elementType: 'all',
  //    advanced_params: filters,
  //    search_by_method: 'advanced',
  //    page_size: uiState.number_of_results
  //  };
  //  UIActions.setSearchSelection(selection);
  //  ElementActions.fetchBasedOnSearchSelectionAndCollection({
  //    selection,
  //    collectionId: uiState.currentCollection.id,
  //    isSync: uiState.isSync
  //  });
  //}


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
            onChange={handleChangeSelection}
          />
        );
      });
    }

    return dynamicRow;
  };

  const handleChangeSelection = (idx, formElement) => (e) => {
    let value = formElement == 'textarea' ? e.target.value : e;
    selectedOptions[idx][formElement] = value;
    setSelectedOptions((a) => [...a]);
  }

  return (
    <>
      <div className="advanced-search">
        <div>
          <AdvancedSearchRow
            idx={0}
            selection={selectedOptions[0]}
            onChange={handleChangeSelection}
          />
          {renderDynamicRow()}
        </div>
      </div>
    </>
  );
}

export default AdvancedSearchForm;
