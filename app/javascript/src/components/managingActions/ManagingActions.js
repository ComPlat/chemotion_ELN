import React from 'react';
import { ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  ShareButton,
  MoveOrAssignButton,
  RemoveOrDeleteButton
} from 'src/components/managingActions/ManagingActionButtons';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import PermissionStore from 'src/stores/alt/stores/PermissionStore';
import PermissionActions from 'src/stores/alt/actions/PermissionActions';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import ManagingModalCollectionActions from 'src/components/managingActions/ManagingModalCollectionActions';
import ManagingModalDelete from 'src/components/managingActions/ManagingModalDelete';
import ManagingModalRemove from 'src/components/managingActions/ManagingModalRemove';
import ManagingModalTopSecret from 'src/components/managingActions/ManagingModalTopSecret';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { elementNames } from 'src/apps/generic/Utils';


export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
    const { currentUser, genericEls } = UserStore.getState();
    this.state = {
      currentUser,
      currentCollection: { id: 0 },
      sharing_allowed: false,
      deletion_allowed: false,
      remove_allowed: false,
      is_top_secret: false,
      genericEls: genericEls
    };

    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.onChange = this.onChange.bind(this);

    this.onUserChange = this.onUserChange.bind(this);
    this.onPermissionChange = this.onPermissionChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    UIStore.listen(this.onChange);
    PermissionStore.listen(this.onPermissionChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
    UIStore.unlisten(this.onChange);
    PermissionStore.unlisten(this.onPermissionChange);
  }

  async onChange(state) {
    const { currentCollection } = state;
    if (this.collectionChanged(state)) {
      this.setState({
        sharing_allowed: false,
        deletion_allowed: false,
        remove_allowed: false,
        is_top_secret: false,
        hasSel: false,
        currentCollection
      });
    } else {
      const klassArray = await elementNames(true);
      const newHasSel = klassArray.some((el) => {
        return (state[el] && (state[el].checkedIds.size > 0 || state[el].checkedAll));
      });
      PermissionActions.fetchPermissionStatus(state);
      const { hasSel } = this.state;
      if (newHasSel != hasSel) this.setState({ hasSel: newHasSel });
    }
  }

  onUserChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({
        currentUser: state.currentUser,
      });
    }
    if (typeof state.genericEls !== 'undefined' && state.genericEls !== null) {
      this.setState({
        genericEls: state.genericEls
      });
    }
  }

  onPermissionChange(state) {
    this.setState({ ...state });
  }

  collectionChanged(state) {
    const { currentCollection } = state;
    if (typeof currentCollection === 'undefined' || currentCollection == null) {
      return false;
    }
    const { id, is_sync_to_me } = currentCollection;
    return this.state.currentCollection.id !== id ||
      this.state.currentCollection.is_sync_to_me !== is_sync_to_me;
  }

  // eslint-disable-next-line react/sort-comp
  handleButtonClick(type) {
    const modalProps = { show: true, action: '', listSharedCollections: false };
    switch (type) {
      case 'share':
        if (!this.state.is_top_secret) {
          modalProps.title = "Sharing";
          modalProps.component = ManagingModalSharing;
        } else {
          modalProps.title = "Sharing not allowed";
          modalProps.component = ManagingModalTopSecret;
        }
        break;
      case 'move':
        modalProps.title = "Move to Collection";
        modalProps.component = ManagingModalCollectionActions;
        modalProps.action = ElementActions.updateElementsCollection;
        modalProps.listSharedCollections = true;
        break;
      case 'remove':
        modalProps.title = "Remove selected elements from this Collection?";
        modalProps.component = ManagingModalRemove;
        modalProps.action = ElementActions.removeElementsCollection;
        break;
      case 'assign':
        modalProps.title = "Assign to Collection";
        modalProps.component = ManagingModalCollectionActions;
        modalProps.action = ElementActions.assignElementsCollection;
        modalProps.listSharedCollections = false;
        break;
      case 'delete':
        modalProps.title = "Delete from all Collections?";
        modalProps.component = ManagingModalDelete;
        modalProps.action = ElementActions.deleteElements;
        break;
      default:
    }

    this.props.updateModalProps(modalProps);
  }

  render() {
    const { customClass } = this.props;
    const { currentCollection, sharing_allowed, deletion_allowed, hasSel } = this.state;
    const { is_locked, label } = currentCollection;
    const isAll = is_locked && label === 'All';
    const noSel = !hasSel

    const moveDisabled = noSel || isAll;
    const assignDisabled = noSel;
    const removeDisabled = noSel || isAll || !deletion_allowed; //!remove_allowed
    const deleteDisabled = noSel || !deletion_allowed;
    const shareDisabled = noSel || !sharing_allowed;

    return (
      <ButtonGroup className="d-flex align-items-center">
        <MoveOrAssignButton
          assignDisabled={assignDisabled}
          moveDisabled={moveDisabled}
          onClick={this.handleButtonClick}
          customClass={customClass}
        />
        <RemoveOrDeleteButton
          removeDisabled={removeDisabled}
          deleteDisabled={deleteDisabled}
          onClick={this.handleButtonClick}
          customClass={customClass}
        />
        <ShareButton
          isDisabled={shareDisabled}
          onClick={this.handleButtonClick}
          customClass={customClass}
        />
      </ButtonGroup>
    );
  }
}

ManagingActions.propTypes = {
  updateModalProps: PropTypes.func.isRequired,
  customClass: PropTypes.string,
};

ManagingActions.defaultProps = {
  customClass: null,
};
