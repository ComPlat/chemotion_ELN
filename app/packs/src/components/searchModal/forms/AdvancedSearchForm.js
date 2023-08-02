import React, { useEffect, useContext } from 'react';
import { Button, ButtonToolbar, ToggleButtonGroup, ToggleButton, Panel, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { togglePanel, showErrorMessage, panelVariables } from './SearchModalFunctions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import AdvancedSearchRow from './AdvancedSearchRow';
import DetailSearch from './DetailSearch';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AdvancedSearchForm = () => {
  const elnElements = ['samples', 'reactions', 'wellplates', 'screens', 'research_plans'];
  const genericElements = UserStore.getState().genericEls || [];
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);

  useEffect(() => {
    let advancedValues = searchStore.advancedSearchValues;
    const length = advancedValues.length - 1;
    const lastInputRow = searchStore.advancedSearchValues[length];
    
    const checkSelectedElements =
      (lastInputRow.field && lastInputRow.value && lastInputRow.link) ||
      (length == 0 && lastInputRow.field && lastInputRow.value);
    
    if (checkSelectedElements) {
      let searchValues = {
        link: 'OR', match: 'LIKE',
        table: advancedValues[0].table,
        element_id: advancedValues[0].element_id,
        field: '', value: '', unit: ''
      };
      searchStore.addAdvancedSearchValue(length + 1, searchValues);
    }
  }, [searchStore.advancedSearchValues]);

  const filterSearchValues = () => {
    let filteredOptions = [];
    if (searchStore.detail_search_values.length >= 1) {
      searchStore.detailSearchValues.map((f, i) => {
        let values = { ...Object.values(f)[0] };
        if (values.value != '') {
          filteredOptions.push(values);
        }
      });
      if (filteredOptions[0]) {
        filteredOptions[0].link = '';
      }
    } else {
      filteredOptions = searchStore.advancedSearchValues.filter((f, id) => {
        return (f.field && f.link && f.value) ||
          (id == 0 && f.field && f.value)
      });
    }
    console.log(filteredOptions);
    searchStore.changeSearchFilter(filteredOptions);
    const storedFilter = searchStore.searchFilters;
    return storedFilter.length == 0 ? [] : storedFilter[0].filters;
  }

  const handleSave = () => {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const filters = filterSearchValues();
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
  }

  const handleChangeElement = (element) => {
    const table = elnElements.includes(element) ? element : 'elements';
    const genericElement = (!elnElements.includes(element) && genericElements.find(el => el.name + 's' === element)) || {};

    searchStore.changeSearchElement({
      table: table,
      element_id: (genericElement.id || 0),
      element_table: element
    });
    let searchValues = { ...searchStore.advancedSearchValues[0] };
    searchValues.table = table;
    searchValues.element_id = (genericElement.id || 0);
    searchStore.addAdvancedSearchValue(0, searchValues);
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
        key="element-options"
        value={searchStore.searchElement.element_table}
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
        let table = val.field.table || val.table;
        table = table.charAt(0).toUpperCase() + table.slice(1, -1).replace('_', ' ');

        if (val.field.sub_fields) {
          let label = '';
          val.field.sub_fields.map((sub) => {
            if (sub.type == 'label') {
              label = sub.value;
            } else if (sub.value != '') {
              searchValues.push([val.link, table, `${val.field.label.toLowerCase()}: ${label.toLowerCase()}`, val.match, sub.value, val.unit].join(" "));
            }
          });
        } else {
          searchValues.push([val.link, table, val.field.label.toLowerCase(), val.match, val.value, val.unit].join(" "));
        }
      });
    }
    searchStore.changeSearchValues(searchValues);
  }

  const renderDynamicRow = () => {
    let dynamicRow = (<span />);

    if (searchStore.advancedSearchValues.length > 1) {
      let addedSelections = searchStore.advancedSearchValues.filter((val, idx) => idx > 0);

      dynamicRow = addedSelections.map((_, idx) => {
        let id = idx + 1;
        return (
          <AdvancedSearchRow idx={id} key={`selection_${id}`} />
        );
      });
    }

    return dynamicRow;
  };

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
              <SelectSearchTable />
              <ToggleButtonGroup
                type="radio"
                name="types"
                key="toggleTypes"
                value={searchStore.searchType}
                onChange={(e) => searchStore.changeSearchType(e)}
                defaultValue="advanced"
                className="vertical-buttons">
                <ToggleButton
                  key="detail"
                  value="detail">
                  Detail
                </ToggleButton>
                <ToggleButton
                  key="advanced"
                  value="advanced">
                  Advanced
                </ToggleButton>
              </ToggleButtonGroup>
              <div className="scrollable-content">
                {showErrorMessage(searchStore)}
                {
                  searchStore.searchType == 'advanced' ? (
                    <>
                      <AdvancedSearchRow idx={0} key={"selection_0"} />
                      {renderDynamicRow()}
                    </>
                  ) : (
                    <DetailSearch
                      key={searchStore.searchElement.element_table}
                    />
                  )
                }
              </div>
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
