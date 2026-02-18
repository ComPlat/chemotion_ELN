import React, { useEffect, useContext } from 'react';
import { Accordion } from 'react-bootstrap';
import {
  togglePanel, handleClear, showErrorMessage, handleSearch,
  AccordeonHeaderButtonForSearchForm, SearchButtonToolbar, panelVariables
} from './SearchModalFunctions';
import SearchResult from './SearchResult';
import PublicationSearchRow from './PublicationSearchRow';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PublicationSearch = () => {
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);
  const activeSearchAccordionClass = searchStore.search_accordion_active_key === 0 ? 'active' : '';
  const activeResultAccordionClass = searchStore.search_accordion_active_key === 1 ? ' active' : '';

  useEffect(() => {
    let referenceValues = searchStore.publicationSearchValues;
    const length = referenceValues.length - 1;
    const lastInputRow = searchStore.publicationSearchValues[length];
    
    const checkSelectedElements =
      (lastInputRow.field && lastInputRow.value && lastInputRow.link) ||
      (length == 0 && lastInputRow.field && lastInputRow.value);
    
    if (checkSelectedElements) {
      let searchValues = {
        link: 'OR', match: 'ILIKE',
        table: referenceValues[0].table,
        field: '', value: ''
      };
      searchStore.addPublicationSearchValue(length + 1, searchValues);
    }
  }, [searchStore.publicationSearchValues]);

  const renderDynamicRow = () => {
    let dynamicRow = (<span />);

    if (searchStore.publicationSearchValues.length > 1) {
      let addedSelections = searchStore.publicationSearchValues.filter((val, idx) => idx > 0);

      dynamicRow = addedSelections.map((_, idx) => {
        let id = idx + 1;
        return (
          <PublicationSearchRow idx={id} key={`selection_${id}`} />
        );
      });
    }

    return dynamicRow;
  }

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
            <div className="advanced-search-content-scrollable-body without-header">
              {showErrorMessage(searchStore)}
              <PublicationSearchRow idx={0} key={"selection_0"} />
              {renderDynamicRow()}
            </div>
            <SearchButtonToolbar store={searchStore} />
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
      <Accordion.Item eventKey={1} className={`${panelVars.invisibleClassName}${activeResultAccordionClass}`}>
        <h2 className="accordion-header">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.resultTitle}
            eventKey={1}
            disabled={false}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={1} className="search-result-body">
          <div className="accordion-body">
            <SearchResult
              handleClear={() => handleClear(searchStore)}
            />
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(PublicationSearch);
