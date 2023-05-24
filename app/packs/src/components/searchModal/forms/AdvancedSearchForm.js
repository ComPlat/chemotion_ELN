import React, { useState, useEffect, useContext } from 'react';
import { Button, ButtonGroup, ButtonToolbar, ToggleButtonGroup, ToggleButton, Panel, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { togglePanel, showErrorMessage, panelVariables } from './SearchModalFunctions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import AdvancedSearchRow from './AdvancedSearchRow';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AdvancedSearchForm = () => {
  const defaultSelections = [{
    link: '',
    match: '=',
    table: 'samples',
    element_id: 0,
    element_table: 'samples',
    field: {
      column: 'name',
      label: 'Name',
    },
    value: '',
    unit: ''
  }];

  const elnElements = ['samples', 'reactions', 'wellplates', 'screens', 'research_plans'];
  const genericElements = UserStore.getState().genericEls || [];
  const [selectedOptions, setSelectedOptions] = useState(defaultSelections);
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);

  useEffect(() => {
    const length = selectedOptions.length - 1;
    const lastInputRow = selectedOptions[length];

    const checkSelectedElements =
      (lastInputRow.field && lastInputRow.value && lastInputRow.link) ||
      (length == 0 && lastInputRow.field && lastInputRow.value);

    if (checkSelectedElements) {
      selectedOptions.push(
        {
          link: 'OR', match: 'LIKE',
          table: selectedOptions[0].table,
          element_id: selectedOptions[0].element_id,
          element_table: selectedOptions[0].element_table,
          field: '', value: '', unit: ''
        }
      );
      setSelectedOptions((a) => [...a]);
    }
  }, [selectedOptions, setSelectedOptions]);

  const filterSelectedOptions = () => {
    const filteredOptions = selectedOptions.filter((f, id) => {
      return (f.field && f.link && f.value) ||
        (id == 0 && f.field && f.value)
    });
    searchStore.changeSearchFilter(filteredOptions);
    const storedFilter = searchStore.searchFilters;
    return storedFilter.length == 0 ? [] : storedFilter[0].filters;
  }

  const handleSave = () => {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const filters = filterSelectedOptions();
    searchStore.changeErrorMessage("Please fill out all needed fields");

    if (filters.length > 0) {
      searchStore.showSearchResults();
      searchStore.changeErrorMessage("");

      const selection = {
        elementType: 'all',
        advanced_params: filters,
        search_by_method: 'advanced',
        page_size: uiState.number_of_results
      };

      searchStore.loadSearchResults({
        selection,
        collectionId: collectionId,
        isSync: uiState.isSync,
      });
      searchStore.clearSearchAndTabResults();
      searchValuesByFilters();
    }
  }

  const handleClear = () => {
    searchStore.clearSearchResults();
    setSelectedOptions(defaultSelections);
  }

  const handleChangeElement = (element) => {
    const table = elnElements.includes(element) ? element : 'elements';
    const genericElement = (!elnElements.includes(element) && genericElements.find(el => el.name + 's' === element)) || {};

    defaultSelections[0].table = table;
    defaultSelections[0].element_id = (genericElement.id || 0);
    defaultSelections[0].element_table = element
    setSelectedOptions(defaultSelections);
    setSelectedOptions((a) => [...a]);
  }

  const SelectSearchTable = () => {
    const layout = UserStore.getState().profile.data.layout;

    const elnElements = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];

    const buttons = Object.entries(layout).filter((value) => {
      return value[1] > 0
      // && elnElements.includes(value[0] + 's');
    })
      .sort((a, b) => a[1] - b[1])
      .map((value) => {
        let iconClass = `icon-${value[0]}`;
        if (!elnElements.includes(value[0])) {
          const genericElement = (genericElements && genericElements.find(el => el.name === value[0])) || {};
          iconClass = `${genericElement.icon_name} icon_generic_nav`;
        }
        let tooltip = (
          <Tooltip id="_tooltip_history" className="left_tooltip">
            {value[0].charAt(0).toUpperCase() + value[0].slice(1).replace('_', ' ')}
          </Tooltip>
        );

        return (
          <ToggleButton
            key={value[0]}
            value={`${value[0]}s`}>
            <OverlayTrigger delayShow={500} placement="top" overlay={tooltip}>
              <i className={iconClass} />
            </OverlayTrigger>
          </ToggleButton>
        );
      });

    return (
      <ToggleButtonGroup
        type="radio"
        name="options"
        value={selectedOptions[0].element_table}
        onChange={handleChangeElement}
        defaultValue={0}
        className="toggle-elements">
        {buttons}
      </ToggleButtonGroup>
    );
  }

  const searchValuesByFilters = () => {
    const storedFilter = searchStore.searchFilters;
    const filters = storedFilter.length == 0 ? [] : storedFilter[0].filters;
    let searchValues = [];

    if (searchStore.searchResultVisible && filters.length > 0) {
      filters.map((val, i) => {
        let table = val.table.charAt(0).toUpperCase() + val.table.slice(1, -1).replace('_', ' ');
        searchValues.push([val.link, table, val.field.label.toLowerCase(), val.match, val.value, val.unit].join(" "));
      });
    }
    searchStore.changeSearchValues(searchValues);
  }

  const renderDynamicRow = () => {
    let dynamicRow = (<span />);

    if (selectedOptions.length > 1) {
      let addedSelections = selectedOptions.filter((val, idx) => idx > 0);

      dynamicRow = addedSelections.map((selection, idx) => {
        let id = idx + 1;
        return (
          <AdvancedSearchRow
            idx={id}
            selection={selection}
            key={`selection_${id}`}
            onChange={handleChangeSelection}
          />
        );
      });
    }

    return dynamicRow;
  };

  const formElementValue = (formElement, e) => {
    switch (formElement) {
      case 'value':
        const value = typeof e.target !== 'undefined' ? e.target.value : (typeof e.value !== 'undefined' ? e.value : e);
        return value;
        break;
      case 'field':
      case 'link':
      case 'match':
      case 'unit':
        return e.value;
        break;
      default:
        return e;
    }
  }

  const temperatureConditions = (idx, column) => {
    if (selectedOptions[idx]['unit'] == '' || column == 'temperature') {
      selectedOptions[idx]['unit'] = '°C';
    }
    if (selectedOptions[idx]['match'] != '=') {
      selectedOptions[idx]['match'] = '=';
    }
  }

  const durationConditions = (idx, column) => {
    if (selectedOptions[idx]['unit'] == '' || column == 'duration') {
      selectedOptions[idx]['unit'] = 'Hour(s)';
    }
    if (selectedOptions[idx]['match'] != '=') {
      selectedOptions[idx]['match'] = '=';
    }
  }

  const checkValueForNumber = (value) => {
    if (isNaN(Number(value))) {
      searchStore.changeErrorMessage("Only numbers are allowed");
    } else {
      searchStore.changeErrorMessage('');
    }
  }

  const handleChangeSelection = (idx, formElement) => (e) => {
    let value = formElementValue(formElement, e, e.currentTarget);
    const fieldColumn = selectedOptions[idx]['field'].column;
    const additionalFields = ['temperature', 'duration'];
    selectedOptions[idx][formElement] = value;
    if (value.column == 'temperature') { temperatureConditions(idx, value.column) }
    if (value.column == 'duration') { durationConditions(idx, value.column) }
    if (additionalFields.includes(fieldColumn) && formElement == 'value') { checkValueForNumber(value) }
    if (!additionalFields.includes(fieldColumn) && formElement != 'unit' && !additionalFields.includes(value.column)) { selectedOptions[idx]['unit'] = '' }
    setSelectedOptions((a) => [...a]);
  }
  // onClick={() => searchStore.toggleSearchType()}

  return (
    <>
      <Panel
        id="collapsible-search"
        className={panelVars.defaultClassName}
        onToggle={togglePanel(searchStore)}
        expanded={searchStore.searchVisible}
      >
        <Panel.Heading className={panelVars.inactiveSearchClass}>
          <Panel.Title toggle>
            {panelVars.searchTitle}
            <i className={panelVars.searchIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <div className="advanced-search">
              {showErrorMessage(searchStore)}
              <SelectSearchTable />
              <ButtonGroup className="vertical-buttons" bsSize="large">
                <Button>Detail</Button>
                <Button active>Advanced</Button>
              </ButtonGroup>
              <AdvancedSearchRow
                idx={0}
                selection={selectedOptions[0]}
                key={"selection_0"}
                onChange={handleChangeSelection}
              />
              {renderDynamicRow()}
            </div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={() => searchStore.handleCancel()}>
                Cancel
              </Button>
              <Button bsStyle="primary" onClick={handleSave} style={{ marginRight: '20px' }} >
                Search
              </Button>
            </ButtonToolbar>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel
        id="collapsible-result"
        className={panelVars.defaultClassName + panelVars.invisibleClassName}
        onToggle={togglePanel(searchStore)}
        expanded={searchStore.searchResultVisible}
      >
        <Panel.Heading className={panelVars.inactiveResultClass}>
          <Panel.Title toggle>
            {panelVars.resultTitle}
            <i className={panelVars.resultIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body style={{ minHeight: '120px' }}>
            <SearchResult
              handleClear={handleClear}
            />
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(AdvancedSearchForm);
