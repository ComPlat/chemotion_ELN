import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
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

  componentWillReceiveProps(nextProps) {
    this.setState({
      isDisabled: nextProps.isDisabled
    })
  }

  onPermissionChange(state) {
    this.setState({
      isTopSecret: state.is_top_secret
    })
  }

  filterParamsFromUIState(uiState) {
    let collectionId = uiState.currentCollection.id;

    let filterParams = {
      sample: {
        all: uiState.sample.checkedAll,
        included_ids: uiState.sample.checkedIds,
        excluded_ids: uiState.sample.uncheckedIds,
        collection_id: collectionId
      },
      reaction: {
        all: uiState.reaction.checkedAll,
        included_ids: uiState.reaction.checkedIds,
        excluded_ids: uiState.reaction.uncheckedIds,
        collection_id: collectionId
      },
      wellplate: {
        all: uiState.wellplate.checkedAll,
        included_ids: uiState.wellplate.checkedIds,
        excluded_ids: uiState.wellplate.uncheckedIds,
        collection_id: collectionId
      },
      screen: {
        all: uiState.screen.checkedAll,
        included_ids: uiState.screen.checkedIds,
        excluded_ids: uiState.screen.uncheckedIds,
        collection_id: collectionId
      }
    };
    return filterParams;
  }

  handleModalShow() {
    let uiState = UIStore.getState();
    let elementsFilter = this.filterParamsFromUIState(uiState);

    let params = {
      elements_filter: elementsFilter
    };

    //PermissionActions.fetchTopSecretStatus(params);
    this.props.onClick();
  }

  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip id="share_button">Share</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="info" onClick={() => this.handleModalShow()} disabled={isDisabled}>
          <i className="fa fa-share-alt"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
