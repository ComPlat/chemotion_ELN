import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import UIStore from '../stores/UIStore';
import CollectionActions from '../actions/CollectionActions';

export default class ShareModal extends React.Component {
  constructor(props) {
    super(props);

    // TODO the same for reactions and so on
    this.state = {
      checkedSampleIds: UIStore.getState().checkedSampleIds
    }
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    // TODO see constructor
    this.setState({
      checkedSampleIds: state.checkedSampleIds
    })
  }

  hideModal() {
    //this.context.router.transitionTo('/');
  }

  handleSharing() {
    let permissionLevel = this.refs.permissionLevelSelect.getValue();
    let sampleDetailLevel = this.refs.sampleDetailLevelSelect.getValue();
    let reactionDetailLevel = this.refs.reactionDetailLevelSelect.getValue();
    let wellplateDetailLevel = this.refs.wellplateDetailLevelSelect.getValue();
    // TODO beautify
    let userIds = this.refs.userSelect.state.values.map(o => o.value);

    let paramObj = {
      collection_attributes: {
        // TODO replace by convention label
        label: 'test',
        is_shared: true,
        permission_level: permissionLevel,
        sample_detail_level: sampleDetailLevel,
        reaction_detail_level: reactionDetailLevel,
        wellplate_detail_level: wellplateDetailLevel
      },
      sample_ids: this.state.checkedSampleIds,
      user_ids: userIds
    }

    CollectionActions.createSharedCollections(paramObj);
    this.hideModal();
  }

  render() {
    return (
      <div>
        <Modal animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Sharing</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Input ref='permissionLevelSelect' type='select' label='Permission level'>
              <option value='0'>Read</option>
              <option value='1'>Write</option>
              <option value='2'>Share</option>
              <option value='3'>Delete</option>
              <option value='4'>Take ownership</option>
            </Input>
            <Input ref='sampleDetailLevelSelect' type='select' label='Sample detail level'>
              <option value='0'>Molecular mass of compound/External label</option>
              <option value='1'>Molecule, structure</option>
              <option value='2'>Analysis Result/Description</option>
              <option value='3'>Analysis Datasets</option>
              <option value='4'>Everything</option>
            </Input>
            <Input ref='reactionDetailLevelSelect' type='select' label='Reaction detail level'>
              <option value='0'>Include Sample Level 1</option>
              <option value='1'>Observation/Description/Calculation</option>
              <option value='2'>Include Sample Level 2</option>
              <option value='3'>Everything</option>
            </Input>
            <Input ref='wellplateDetailLevelSelect' type='select' label='Wellplate detail level'>
              <option value='0'>Include Samples Level 0/Wells (Positions)</option>
              <option value='1'>Include Sample 1</option>
              <option value='2'>Readout</option>
              <option value='3'>Everything</option>
            </Input>

            <b>Select Users to share with</b>
            <Select ref='userSelect' name='users' multi={true}
                    options={[
                      { value: '2', label: 'Hattori' },
                      { value: '3', label: 'Momochi' }
                    ]} />
            <br/>
            <Button bsStyle="warning" onClick={this.handleSharing.bind(this)}>Share</Button>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}

