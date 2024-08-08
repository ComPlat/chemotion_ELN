import React from 'react';
import { ButtonGroup, Button, DropdownButton, MenuItem } from 'react-bootstrap';
import PropTypes from 'prop-types';

import AutoCompleteInput from 'src/components/navigation/search/AutoCompleteInput';
import SearchModal from 'src/components/searchModal/SearchModal';
import SuggestionsFetcher from 'src/fetchers/SuggestionsFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class Search extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      elementType: 'all',
      queryMolfile: null,
      searchType: 'sub',
      tanimotoThreshold: 0.7,
    };
    this.handleClearSearchSelection = this.handleClearSearchSelection.bind( this);
  }

  handleSelectionChange(selection) {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isPublic = this.props.isPublic;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    selection.elementType = this.state.elementType;
    UIActions.setSearchSelection(selection);
    selection.page_size = uiState.number_of_results;
    ElementActions.fetchBasedOnSearchSelectionAndCollection(
      { selection, collectionId, isSync, isPublic });
  }

  search(query) {
    const { currentCollection } = UIStore.getState();
    const id = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    return SuggestionsFetcher.fetchSuggestionsForCurrentUser(
      this.state.elementType.toLowerCase(), query, id, isSync
    );
  }

  handleClearSearchSelection() {
    const { currentCollection, isSync } = UIStore.getState();
    this.setState({ elementType: 'all' })
    currentCollection['clearSearch'] = true;
    isSync ? UIActions.selectSyncCollection(currentCollection)
      : UIActions.selectCollection(currentCollection);
  }

  handleElementSelection(event, element = null) {
    if (event.startsWith('elements-')) {
      this.showGenericElCriteria();
      this.setState({ elementType: 'elements', genericEl: element });
    } else {
      this.setState({ elementType: event });
    }
  }

  renderMenuItems() {
    const elements = [
      'All',
      'Samples', 'Reactions',
      'Wellplates', 'Screens','Cell lines'
    ];

    const menu = elements.map(element => (
      <MenuItem key={element} onSelect={() => this.handleElementSelection(element.toLowerCase())}>
        {element}
      </MenuItem>
    ));

    return menu;
  }

  render() {
    const { profile } = UserStore.getState();
    const { customClass } = (profile && profile.data) || {};

    const buttonAfter = (
      <ButtonGroup>
        <Button bsStyle={customClass ? null : 'info'} className={customClass} id="open-search-modal" onClick={() => this.context.search.showSearchModal()}>
          <i className="fa fa-search" />
        </Button>
        <Button bsStyle={customClass ? null : 'danger'} className={customClass} onClick={this.handleClearSearchSelection}>
          <i className="fa fa-times" />
        </Button>
      </ButtonGroup>
    );

    const inputAttributes = {
      placeholder: 'IUPAC, InChI, SMILES, RInChI...',
      style: { minWidth: 200, maxWidth: 300 }
    };

    const suggestionsAttributes = {
      style: {
        marginTop: 15,
        width: 398,
        maxHeight: 400
      }
    };

    const searchIcon = (elementType) => {
      if (elementType === 'all') return 'All';
      if (['samples', 'reactions', 'screens', 'wellplates'].includes(elementType.toLowerCase())) return (<i className={`icon-${elementType.toLowerCase().slice(0, -1)}`} />);
      if(elementType == 'cell lines'){
        return (<i className={`icon-cell_line`} />);
      }
      if (this.state.genericEl) return (<i className={this.state.genericEl.icon_name} />);
      return elementType;
    }

    const innerDropdown = (
      <DropdownButton
        className={customClass}
        id="search-inner-dropdown"
        title={searchIcon(this.state.elementType)}
        style={{ width: '50px' }}
      >
        {this.renderMenuItems()}
      </DropdownButton>
    );

    return (
      <div className="chemotion-search">
        <div className="search-modal-draw">
          <SearchModal />
        </div>
        <div className="search-autocomplete">
          <AutoCompleteInput
            inputAttributes={inputAttributes}
            suggestionsAttributes={suggestionsAttributes}
            suggestions={input => this.search(input)}
            ref={(input) => { this.autoComplete = input; }}
            onSelectionChange={selection => this.handleSelectionChange(selection)}
            buttonBefore={innerDropdown}
            buttonAfter={buttonAfter}
          />
        </div>
      </div>
    );
  }
}

Search.propTypes = {
  noSubmit: PropTypes.bool
};

Search.defaultProps = {
  noSubmit: false,
};
