import React, { useContext } from 'react';
import { Button, ButtonToolbar, ToggleButtonGroup, ToggleButton, Panel } from 'react-bootstrap';
import { togglePanel, showErrorMessage, panelVariables } from './SearchModalFunctions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericFormFields from './GenericFormFields';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const GenericSearchForm = () => {
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);

  const handleSave = () => {
    //const uiState = UIStore.getState();
    //const { currentCollection } = uiState;
    //const collectionId = currentCollection ? currentCollection.id : null;
    //const filters = filterSelectedOptions();
    //searchStore.changeErrorMessage("Please fill out all needed fields");

    //if (filters.length > 0) {
    //  searchStore.showSearchResults();
    //  searchStore.changeErrorMessage("");

    //  const selection = {
    //    elementType: 'all',
    //    advanced_params: filters,
    //    search_by_method: 'advanced',
    //    page_size: uiState.number_of_results
    //  };

    //  searchStore.loadSearchResults({
    //    selection,
    //     collectionId: collectionId,
    //     isSync: uiState.isSync,
    //  });
    //  searchStore.clearSearchAndTabResults();
    //  searchValuesByFilters();
    //}
  }

  const handleClear = () => {
    searchStore.clearSearchResults();
    //setSelectedOptions(defaultSelections);
  }

  return (
    <>
      <Panel
        id="collapsible-search"
        className={panelVars.defaultClassName}
        onToggle={togglePanel()}
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
            <div className="generic-search">
              {showErrorMessage(searchStore)}
              <div>
                <GenericFormFields />
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
          <Panel.Body style={{minHeight: '120px'}}>
            <SearchResult
              handleClear={handleClear}
            />
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(GenericSearchForm);
