import React from 'react';
import {Button, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';


import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

import CollectionActions from '../actions/CollectionActions';

export default class ManagingModalCollectionActions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ui_state: UIStore.getState(),
      collection_state: CollectionStore.getState(),
      labelOfNewCollection: null
    }
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange.bind(this));
    CollectionStore.listen(this.onCollectionChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange.bind(this));
    CollectionStore.unlisten(this.onCollectionChange.bind(this));
  }

  onUIChange(state) {
    this.setState({
      ui_state: state
    })
  }

  onCollectionChange(state) {
    this.setState({
      collection_state: state
    })
  }

  collectionEntriesMap(collections) {

    if (collections == undefined) return []

    let result = collections.reduce(
      (result, collection, index, array) => {
        return result.concat(this.collectionEntriesMap(collection.children))
      },
      []
    )

    return collections.map(
      (collection) => {
        return (<option value={collection.id}>{collection.label}</option>)
      }
    ).concat(result);
  }

  collectionEntries() {
    let collections = this.state.collection_state.unsharedRoots.concat(this.state.collection_state.lockedRoots);
    return this.collectionEntriesMap(collections);
  }

  addCollection() {
    let label = this.refs.collectionLabelInput.getValue() || ''; //TODO: Don't allow empty labels.
    CollectionActions.createUnsharedCollection({label: label});

    this.setState({
      labelOfNewCollection: label
    });
  }

  handleSubmit() {
    let select_ref = this.refs.collectionSelect
    let collection_id = select_ref ? select_ref.getValue() : undefined;
    let newLabel = this.state.labelOfNewCollection;

    if(newLabel) {
      let unsharedCollections = CollectionStore.getState().unsharedRoots;

      let newCollection = unsharedCollections.filter((collection) => {
        return collection.label == newLabel;
      }).pop();

      collection_id = newCollection.id;
    }

    // TODO: This needs to be improved.
    // We are constantly changing the ui_state into this syntax:
    let ui_state = {
      sample: {
        all: this.state.ui_state.sample.checkedAll,
        included_ids: this.state.ui_state.sample.checkedIds,
        excluded_ids: this.state.ui_state.sample.uncheckedIds
      },
      reaction: {
        all: this.state.ui_state.reaction.checkedAll,
        included_ids: this.state.ui_state.reaction.checkedIds,
        excluded_ids: this.state.ui_state.reaction.uncheckedIds
      },
      wellplate: {
        all: this.state.ui_state.wellplate.checkedAll,
        included_ids: this.state.ui_state.wellplate.checkedIds,
        excluded_ids: this.state.ui_state.wellplate.uncheckedIds
      },
      screen: {
        all: this.state.ui_state.screen.checkedAll,
        included_ids: this.state.ui_state.screen.checkedIds,
        excluded_ids: this.state.ui_state.screen.uncheckedIds
      },
      currentCollection: this.state.ui_state.currentCollection,
      currentCollectionId: this.state.ui_state.currentCollection.id
    }

    this.props.action({ui_state: ui_state, collection_id: collection_id});
    this.props.onHide();
  }

  render() {
    return (
      <div>
      <FormGroup>
        <ControlLabel>Select a Collection</ControlLabel>
        <FormControl ref='collectionSelect' componentClass="select">
          {this.collectionEntries()}
        </FormControl>
      </FormGroup>

        <table width="100%"><tbody>
          <tr>
            <td width="95%" className="padding-right">
              <FormGroup>
                <ControlLabel>Create a Collection</ControlLabel>
                <FormControl type="text" ref="collectionLabelInput"
                  placeholder={'-- Please insert collection name --'}
                />
              </FormGroup>
            </td>
            <td width="5%">
              <Button bsSize="small" className="managing-actions-add-btn" bsStyle="success" onClick={this.addCollection.bind(this)}>
                <i className="fa fa-plus"></i>
              </Button>
            </td>
          </tr>
        </tbody></table>
        <Button bsStyle="warning" onClick={() => this.handleSubmit()}>Submit</Button>
      </div>
    )
  }
}
