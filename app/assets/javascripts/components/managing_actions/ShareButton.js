import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import PermissionStore from '../stores/PermissionStore';
import PermissionActions from '../actions/PermissionActions';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isTopSecret: false,
      isDisabled: props.isDisabled
    }
  }

  componentDidMount() {
    PermissionStore.listen(this.onPermissionChange.bind(this));
  }

  componentWillUnmount() {
    PermissionStore.unlisten(this.onPermissionChange.bind(this));
  }

  onPermissionChange(state) {
    this.setState({
      isTopSecret: state.is_top_secret
    })
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      isDisabled: nextProps.isDisabled
    })
  }

  filterParamsFromUIState(uiState) {
    let filterParams = {
      sample: {
        all: uiState.sample.checkedAll,
        included_ids: uiState.sample.checkedIds,
        excluded_ids: uiState.sample.uncheckedIds
      },
      reaction: {
        all: uiState.reaction.checkedAll,
        included_ids: uiState.reaction.checkedIds,
        excluded_ids: uiState.reaction.uncheckedIds
      },
      wellplate: {
        all: uiState.wellplate.checkedAll,
        included_ids: uiState.wellplate.checkedIds,
        excluded_ids: uiState.wellplate.uncheckedIds
      }
    };
    return filterParams;
  }

  showShareModal() {
    let uiState = UIStore.getState();
    let elementsFilter = this.filterParamsFromUIState(uiState);

    let paramObj = {
      elements_filter: elementsFilter
    }

    PermissionActions.fetchTopSecretStatus(paramObj);
  }

  render() {
    const tooltip = (
      <Tooltip>Share the selected elements</Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button bsStyle="info" onClick={this.showShareModal.bind(this)} disabled={this.state.isDisabled}>
          <i className="fa fa-share-alt"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
