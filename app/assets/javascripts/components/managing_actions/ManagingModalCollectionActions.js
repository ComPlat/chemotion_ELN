import React from 'react';
import {Button, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';
import ReactDOM from 'react-dom';
import Select from 'react-select'

export default class ManagingModalCollectionActions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newLabel: null,
      options: null,
      selected: null,
    }
    this.onSelectChange = this.onSelectChange.bind(this);
    this.addCollection = this.addCollection.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    const options = this.collectionOptions();
    const selected = options[0].value;
    this.setState({options, selected});
  }

  onSelectChange(e) {
    this.setState({selected: e});
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

  addCollection() {
    const label = ReactDOM.findDOMNode(this.refs["collectionLabelInput"]).value;
    if(label) {
      CollectionActions.createUnsharedCollection({label: label});
      this.setState({ newLabel: label });
    }
  }

  useNewCollectionId() {
    const unsharedCollections = CollectionStore.getState().unsharedRoots;
    const { newLabel } = this.state;
    const newCollection = unsharedCollections.filter((collection) => {
      return collection.label == newLabel;
    }).pop();
    return newCollection.id;
  }

  handleSubmit() {
    const { selected, newLabel } = this.state;
    let collection_id = parseInt(selected.split("-")[0]);
    let is_sync_to_me = selected.split("-")[1] == "is_sync_to_me";

    if(newLabel) {
      collection_id = this.useNewCollectionId();
      is_sync_to_me = false;
    }

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
                        is_sync_to_me: is_sync_to_me});
    this.props.onHide();
  }

  render() {
    const { options, selected } = this.state;
    return (
      <div>
      <FormGroup>
        <ControlLabel>Select a Collection</ControlLabel>
        <Select options={options}
                value={selected}
                onChange={this.onSelectChange}
                className="select-assign-collection"/>
      </FormGroup>

        <table width="100%"><tbody>
          <tr>
            <td width="95%" className="padding-right">
              <FormGroup>
                <ControlLabel>Create a Collection</ControlLabel>
                <FormControl type="text" ref="collectionLabelInput"
                  placeholder="-- Please insert collection name --"
                />
              </FormGroup>
            </td>
            <td width="5%">
              <Button bsSize="small" className="managing-actions-add-btn"
                      bsStyle="success" onClick={this.addCollection}>
                <i className="fa fa-plus"></i>
              </Button>
            </td>
          </tr>
        </tbody></table>
        <Button bsStyle="warning" onClick={this.handleSubmit}>Submit</Button>
      </div>
    )
  }
}

ManagingModalCollectionActions.propTypes = {
  action: React.PropTypes.func,
  onHide: React.PropTypes.func,
  listSharedCollections: React.PropTypes.bool,
}
