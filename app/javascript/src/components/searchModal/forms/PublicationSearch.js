import React, { useEffect, useContext } from 'react';
import { Button, ButtonToolbar, Form, FormControl, Radio, Grid, Row, Col, Panel } from 'react-bootstrap';
import { togglePanel, handleClear, showErrorMessage, handleSearch, panelVariables } from './SearchModalFunctions';
import SearchResult from './SearchResult';
import PublicationSearchRow from './PublicationSearchRow';
import UIStore from 'src/stores/alt/stores/UIStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PublicationSearch = () => {
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);

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
              <div className="scrollable-content">
                {showErrorMessage(searchStore)}
                <PublicationSearchRow idx={0} key={"selection_0"} />
                {renderDynamicRow()}
              </div>
            </div>
            <ButtonToolbar>
              <Button bsStyle="warning" id="advanced-cancel-button" onClick={() => searchStore.handleCancel()}>
                Cancel
              </Button>
              <Button bsStyle="info" onClick={() => handleClear(searchStore)}>
                Reset
              </Button>
              <Button bsStyle="primary" id="advanced-search-button" onClick={() => handleSearch(searchStore, UIStore.getState())} style={{ marginRight: '20px' }} >
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

export default observer(PublicationSearch);
