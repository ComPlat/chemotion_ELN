import React, { useEffect, useContext } from 'react';
import { ToggleButtonGroup, ToggleButton, Tooltip, OverlayTrigger, Stack, Accordion, Form } from 'react-bootstrap';
import {
  togglePanel, handleClear, showErrorMessage, panelVariables,
  AccordeonHeaderButtonForSearchForm, SearchButtonToolbar
} from './SearchModalFunctions';
import UserStore from 'src/stores/alt/stores/UserStore';
import AdvancedSearchRow from './AdvancedSearchRow';
import DetailSearch from './DetailSearch';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const TextSearch = () => {
  const elnElements = ['cell_lines', 'samples', 'reactions', 'wellplates', 'screens', 'research_plans'];
  const genericElements = UserStore.getState().genericEls || [];
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);
  const activeSearchAccordionClass = searchStore.search_accordion_active_key === 0 ? 'active' : '';
  const activeResultAccordionClass = searchStore.search_accordion_active_key === 1 ? ' active' : '';

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

  const handleNumericMatchChange = (e) => {
    searchStore.changeNumericMatchValue(e.target.value);
  }

  const SelectSearchTable = () => {
    const layout = UserStore.getState().profile.data.layout;

    const buttons = Object.entries(layout).filter((value) => {
      return value[1] > 0
    })
      .sort((a, b) => a[1] - b[1])
      .map((value) => {
        const genericElement = (genericElements && genericElements.find(el => el.name === value[0])) || {};
        if (genericElement.id === undefined && !elnElements.includes(`${value[0]}s`)) { return }

        let iconClass = `icon-${value[0]}`;
        if (!elnElements.includes(`${value[0]}s`)) {
          iconClass = `${genericElement.icon_name} icon_generic_nav`;
        }
        let tooltip = (
          <Tooltip id="_tooltip_history" className="left_tooltip">
            {value[0].charAt(0).toUpperCase() + value[0].slice(1).replace(/_/g, ' ')}
          </Tooltip>
        );

        return (
          <ToggleButton
            key={value[0]}
            id={value[0]}
            value={`${value[0]}s`}
            variant="outline-dark"
          >
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
        className="advanced-search-toggle-elements"
      >
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
          role="button"
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
    <Accordion defaultActiveKey={0} activeKey={searchStore.search_accordion_active_key} className="search-modal" flush>
      <Accordion.Item eventKey={0} className={activeSearchAccordionClass}>
        <h2 className="accordion-header">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.searchTitle}
            eventKey={0}
            disabled={searchStore.search_accordion_toggle_disabled}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={0}>
          <div className="accordion-body">
            <Stack direction="horizontal" className="advanced-search-content-header" gap={2}>
              <SelectSearchTable />
              <SwitchToAdvancedOrDetailSearch />
            </Stack>
            <div className="advanced-search-content-scrollable-body">
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
            <Form className="d-flex align-items-center gap-5">
              <SearchButtonToolbar store={searchStore} />
              {
                searchStore.searchType == 'detail' && (
                  <Form.Group className="d-flex align-items-baseline gap-4">
                    <span>Change search operator for numeric Fields:</span>
                    <Form.Check
                      type="radio"
                      name="equal_higher_or_lower"
                      id="equal_higher_or_lower_higher"
                      label=">="
                      value=">="
                      checked={searchStore.numeric_match === '>='}
                      onChange={handleNumericMatchChange}
                    />
                    <Form.Check
                      type="radio"
                      name="equal_higher_or_lower"
                      id="equal_higher_or_lower_higher"
                      label="<="
                      value="<="
                      checked={searchStore.numeric_match === '<='}
                      onChange={handleNumericMatchChange}
                    />
                  </Form.Group>
                )
              }
            </Form>
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
      <Accordion.Item eventKey={1} className={`${panelVars.invisibleClassName}${activeResultAccordionClass}`}>
        <h2 className="accordion-header">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.resultTitle}
            eventKey={1}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={1}>
          <div className="accordion-body">
            <SearchResult handleClear={() => handleClear(searchStore)} />
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(TextSearch);
