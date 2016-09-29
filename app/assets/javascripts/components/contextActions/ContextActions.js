import React from 'react';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import CreateButton from './CreateButton';
import ReportButton from './ReportButton';
import ExportImportButton from './ExportImportButton';
import ElementActions from '../actions/ElementActions';
import ModalImport from './ModalImport';

export default class ContextActions extends React.Component {
  constructor(props) {
    super(props);
    const uiState = UIStore.getState();
    this.state = {
      uiState
    }
  }

  componentDidMount() {
    UIStore.listen(state => this.onChange(state));
  }

  componentWillUnmount() {
    UIStore.unlisten(state => this.onChange(state));
  }

  onChange(state) {
    const uiState = state;
    this.setState({
      uiState
    });
  }

  isAllCollection() {
    const {currentCollection} = this.state.uiState;
    return currentCollection && currentCollection.label == 'All';
  }

  isDisabled() {
    const {currentCollection} = this.state.uiState

    if (currentCollection) {
      if (currentCollection.label == 'All' ||
          (currentCollection.is_shared == true && currentCollection.permission_level < 4))
      return true
    }

    return false
  }

  importFunction() {
    const title = "Import Samples from File";
    const component = ModalImport;
    const action = ElementActions.importSamplesFromFile;
    const listSharedCollections = false
    const modalProps = {
      show: true,
      title,
      component,
      action,
      listSharedCollections,
    };
    this.props.updateModalProps(modalProps);
  }

  render() {
    const { uiState } = this.state;
    return (
      <div style={{display: 'inline', float: 'left'}}>
        <ButtonGroup>
          <ExportImportButton isDisabled={this.isDisabled()}
                              importFunction={this.importFunction.bind(this)}
                              uiState={uiState} />
          <ReportButton />
        </ButtonGroup>
        <ButtonGroup style={{marginLeft: '10px'}}>
          <CreateButton isDisabled={this.isAllCollection()}/>
        </ButtonGroup>
      </div>
    )
  }
}

ContextActions.propTypes = {
  modalProps: React.PropTypes.object.isRequired,
  updateModalProps: React.PropTypes.func.isRequired,
};
