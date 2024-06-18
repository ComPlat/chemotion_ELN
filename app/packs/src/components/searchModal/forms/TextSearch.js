import React, { useEffect, useContext } from 'react';
import { Button, ButtonToolbar, ToggleButtonGroup, ToggleButton, Panel, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { togglePanel, handleClear, showErrorMessage, handleSearch, panelVariables } from './SearchModalFunctions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import AdvancedSearchRow from './AdvancedSearchRow';
import DetailSearch from './DetailSearch';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const TextSearch = () => {
  const elnElements = ['cell_line', 'samples', 'reactions', 'wellplates', 'screens', 'research_plans'];
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
        link: 'OR', match: 'ILIKE',
        table: advancedValues[0].table,
        element_id: advancedValues[0].element_id,
        field: '', value: '', smiles: '', sub_values: [],
        unit: '', validationState: null
      };
      searchStore.addAdvancedSearchValue(length + 1, searchValues);
    }
  }, [searchStore.advancedSearchValues]);

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

    const elnElements = ['cell_line', 'sample', 'reaction', 'screen', 'wellplate', 'research_plan'];

    const buttons = Object.entries(layout).filter((value) => {
      return value[1] > 0
    })
      .sort((a, b) => a[1] - b[1])
      .map((value) => {
        const genericElement = (genericElements && genericElements.find(el => el.name === value[0])) || {};
        if (genericElement.id === undefined && !elnElements.includes(value[0])) { return }

        let iconClass = `icon-${value[0]}`;
        if (!elnElements.includes(value[0])) {
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

  const SwitchToAdvancedOrDetailSearch = () => {
    let advancedOrDetail = searchStore.searchType == 'advanced' ? false : true;
    let activeClass = advancedOrDetail == true ? ' active' : '';
    return (
      <>
        <input
          checked={advancedOrDetail}
          className="advanced-detail-switch"
          onChange={(e) => searchStore.changeSearchType(e)}
          id={`advanced-detail-switch-new`}
          type="checkbox"
        />
        <label
          className={`advanced-detail-switch-label${activeClass}`}
          htmlFor={`advanced-detail-switch-new`}
        >
          {searchStore.searchType.charAt(0).toUpperCase() + searchStore.searchType.slice(1)}
          <span className="advanced-detail-switch-button" />
        </label>
      </>
    );
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
              <SwitchToAdvancedOrDetailSearch />
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
              <Button bsStyle="warning" id="advanced-cancel-button" onClick={() => searchStore.handleCancel()}>
                Cancel
              </Button>
              <Button bsStyle="info" onClick={() => handleClear(searchStore)}>
                Reset
              </Button>
              <Button bsStyle="primary" id="advanced-search-button"
                onClick={() => handleSearch(searchStore, UIStore.getState())} style={{ marginRight: '20px' }} >
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
              handleClear={() => handleClear(searchStore)}
            />
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(TextSearch);
