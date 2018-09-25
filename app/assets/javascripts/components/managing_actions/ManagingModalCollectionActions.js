import React from 'react';
import PropTypes from 'prop-types';
import {Button, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';
import ReactDOM from 'react-dom';
import Select from 'react-select'

export default class ManagingModalCollectionActions extends React.Component {
  constructor(props) {
    super(props);
    const options = this.collectionOptions();
    this.state = {
      newLabel: null,
      options: options,
      selected: null,
    }
    this.onSelectChange = this.onSelectChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  onSelectChange(e) {
    let selected = e && e.value
    this.setState((previousProps,previousState) => {
      return {...previousState, selected: selected}});
  }

  writableColls(colls) {
    return colls.map(coll => {
      return coll.permission_level >= 1 ? coll : null;
    }).filter(r => r!=null);
  }

  collectionEntries() {
    const cState = CollectionStore.getState();
    const cUnshared = [...cState.lockedRoots, ...cState.unsharedRoots];
    let cShared = [];
    let cSynced = [];
    if (this.props.listSharedCollections){
      cState.sharedRoots.map(sharedR => cShared = [...cShared, ...sharedR.children]);
      cState.syncInRoots.map(syncInR => cSynced = [...cSynced, ...syncInR.children]);
      cSynced = this.writableColls(cSynced);
    }

    if (cShared.length > 0) { cShared[0] = Object.assign(cShared[0], { first: true }); }
    if (cSynced.length > 0) { cSynced[0] = Object.assign(cSynced[0], { first: true }); }

    const cAll = [...cUnshared, ...cShared, ...cSynced];
    let cAllTree = [];
    this.makeTree(cAllTree, cAll, 0);
    return cAllTree;
  }

  makeTree(tree, collections, depth) {
    collections.forEach((collection, index) => {
      tree.push({ id: collection.id,
                  label: collection.label,
                  depth: depth,
                  first: collection.first,
                  is_shared: collection.is_shared,
                  is_sync_to_me: collection.is_sync_to_me });
      if(collection.children && collection.children.length > 0) {
        this.makeTree(tree, collection.children, depth + 1)
      }
    });
  }

  collectionOptions() {
    const cAllTree = this.collectionEntries();
    if (cAllTree.length === 0) return [];
    const options = cAllTree.map( leaf => {
      const indent = "\u00A0".repeat(leaf.depth * 3 + 1);
      const className = leaf.first ? "separator" : "";
      return { value: `${leaf.id}-${leaf.is_sync_to_me ? "is_sync_to_me" : ""}`,
                label: indent + leaf.label,
                className: className };
    });
    return options;
  }

  handleSubmit() {
    const { selected, newLabel } = this.state;
    let collection_id = selected && parseInt(selected.split("-")[0]);
    let is_sync_to_me = selected && selected.split("-")[1] == "is_sync_to_me";

    const uiStoreState = UIStore.getState();
    const ui_state = {
      sample: {
        all: uiStoreState.sample.checkedAll,
        included_ids: uiStoreState.sample.checkedIds,
        excluded_ids: uiStoreState.sample.uncheckedIds
      },
      reaction: {
        all: uiStoreState.reaction.checkedAll,
        included_ids: uiStoreState.reaction.checkedIds,
        excluded_ids: uiStoreState.reaction.uncheckedIds
      },
      wellplate: {
        all: uiStoreState.wellplate.checkedAll,
        included_ids: uiStoreState.wellplate.checkedIds,
        excluded_ids: uiStoreState.wellplate.uncheckedIds
      },
      screen: {
        all: uiStoreState.screen.checkedAll,
        included_ids: uiStoreState.screen.checkedIds,
        excluded_ids: uiStoreState.screen.uncheckedIds
      },
      research_plan: {
        all: uiStoreState.research_plan.checkedAll,
        included_ids: uiStoreState.research_plan.checkedIds,
        excluded_ids: uiStoreState.research_plan.uncheckedIds
      },
      currentCollection: uiStoreState.currentCollection,
      currentCollectionId: uiStoreState.currentCollection.id,
      currentSearchSelection: uiStoreState.currentSearchSelection
    }

    this.props.action({ ui_state: ui_state,
                        collection_id: collection_id,
                        is_sync_to_me: is_sync_to_me,
                        newLabel: newLabel
                      });
    this.props.onHide();
  }

  submitButton(){
    const {newLabel, selected} = this.state
    const l = newLabel && newLabel.length
    return l && l > 0 ?
      <Button bsStyle="warning" onClick={this.handleSubmit}>
        Create collection '{newLabel}' and Submit
      </Button>
      : <Button bsStyle="warning" onClick={this.handleSubmit}
          disabled={!selected}>
          Submit
        </Button>
  }

  render() {
    const { options, selected } = this.state;
    const onChange = (e) => {
      const val = e.target && e.target.value
      this.setState((previousState) => {
        return { ...previousState, newLabel: val }
      });
    }
    return (
      <div>
        <FormGroup>
          <ControlLabel>Select a Collection</ControlLabel>
          <Select
            options={options}
            value={selected}
            onChange={this.onSelectChange}
            className="select-assign-collection"
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>or Create a new Collection</ControlLabel>
          <FormControl
            type="text"
            placeholder="-- Please insert collection name --"
            onChange={onChange}
          />
        </FormGroup>
        {this.submitButton()}
      </div>
    )
  }
}

ManagingModalCollectionActions.propTypes = {
  action: PropTypes.func,
  onHide: PropTypes.func,
  listSharedCollections: PropTypes.bool,
}
