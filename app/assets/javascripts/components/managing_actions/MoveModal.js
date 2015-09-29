import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

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
                    <Input type="text" label="Create a new Collection" ref="titleInput"
                      placeholder={'-- Please insert new Collection name --'}
                    />
                  </td>
                  <td width="5%">
                    <Button bsSize="xsmall" bsStyle="success">
                      <i className="fa fa-plus"></i>
                    </Button>
                  </td>
                </tr>
              </table>
            </form>
            <Button bsStyle="warning">Move</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
