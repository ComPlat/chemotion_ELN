import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

import CollectionActions from '../actions/CollectionActions';

import Aviator from 'aviator';

export default class ShareModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ui_state: UIStore.getState(),
      collection_state: CollectionStore.getState()
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

  collectionEntries() {
    let collections = this.state.collection_state.unsharedRoots
    return collections.map(
      (collection) => {
        return (<option value={collection.id}>{collection.label}</option>)
      }
    );
  }

  handleMove() {
    let collection_id = this.refs.collectionSelect.getValue();
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
      currentCollectionId: this.state.ui_state.currentCollectionId
    }
    CollectionActions.updateElementsCollection({ui_state: ui_state, collection_id: collection_id});
  }

  addCollection() {
    let label = this.refs.collectionLabelInput.getValue() || ''; //TODO: Don't allow empty labels.
    CollectionActions.createUnsharedCollection({label: label});
  }

  hideModal() {
    Aviator.navigate(Aviator.getCurrentURI()+'/hide');
  }

  render() {
    return (
      <div>
        <Modal animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Move Selection</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Input ref='collectionSelect' type='select' label='Select a Collection'>
              {this.collectionEntries()}
            </Input>
            <form>
              <table width="100%">
                <tr>
                  <td width="95%" className="padding-right">
                    <Input type="text" label="Create a new Collection" ref="collectionLabelInput"
                      placeholder={'-- Please insert collection name --'}
                    />
                  </td>
                  <td width="5%">
                    <Button bsSize="xsmall" bsStyle="success" onClick={this.addCollection.bind(this)}>
                      <i className="fa fa-plus"></i>
                    </Button>
                  </td>
                </tr>
              </table>
            </form>
            <Button bsStyle="warning" onClick={this.handleMove.bind(this)}>Move</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
