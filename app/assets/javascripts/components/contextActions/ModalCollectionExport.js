import React from 'react';
import {Button, ButtonToolbar, Radio, FormGroup} from 'react-bootstrap';
import PropTypes from 'prop-types';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';

import NotificationActions from '../actions/NotificationActions';

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
    const { onHide, action } = this.props;

    let params = {
      collections: [uiState.currentCollection.id],
      format: 'zip',
      nested: true
    }
    action(params);

    onHide();

    let notification = {
      title: "Exporting",
      message: "The export file is created on the server. This might take a while. The download will start automatically. Please don't close the window.",
      level: "warning",
      dismissible: false,
      uid: "export_collections",
      position: "bl",
      autoDismiss: null
    }

    NotificationActions.add(notification);
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
