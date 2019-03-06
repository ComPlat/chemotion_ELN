import React from 'react';
import {Button, ButtonToolbar, Radio, FormGroup} from 'react-bootstrap';
import PropTypes from 'prop-types';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import ExportFetcher from './../fetchers/ExportFetcher';

export default class ModalCollectionExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {}
    this.handleClick = this.handleClick.bind(this)
  }

  buttonBar() {
    const { onHide } = this.props;
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <Button bsStyle="warning" id="md-export-dropdown"
                title="Export as ZIP file (incl. attachments)" onClick={this.handleClick}>
                Export ZIP
            </Button>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    )
  }

  handleClick() {
    const uiState = UIStore.getState();
    const userState = UserStore.getState();
    const { onHide } = this.props;
    onHide();
    exportCollections(uiState, userState);
  }

  render() {
    const onChange = (v) => this.setState(
      previousState => {return { ...previousState, value: v }}
    )
    return (
      <div>
        {this.buttonBar()}
      </div>
    )
  }
}

ModalCollectionExport.propTypes = {
  onHide: PropTypes.func,
}

const exportCollections = (uiState, userState) => {
  console.log('hey');
  ExportFetcher.createDownloadJob({
    collections: [uiState.currentCollection.id],
    format: 'zip'
  });
}
