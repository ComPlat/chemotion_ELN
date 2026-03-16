import React from 'react';
import { Dropdown, DropdownButton, Button, ButtonGroup, Modal } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import PermissionStore from 'src/stores/alt/stores/PermissionStore';
import PermissionActions from 'src/stores/alt/actions/PermissionActions';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import ManagingModalCollectionActions from 'src/components/managingActions/ManagingModalCollectionActions';
import ManagingModalDelete from 'src/components/managingActions/ManagingModalDelete';
import ManagingModalRemove from 'src/components/managingActions/ManagingModalRemove';
import { elementNames } from 'src/apps/generic/Utils';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class ManagingActions extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { currentUser, genericEls } = UserStore.getState();
    this.state = {
      showModalOfType: null,
      currentUser,
      currentCollection: { id: 0 },
      sharing_allowed: false,
      deletion_allowed: false,
      remove_allowed: false,
      is_top_secret: false,
      genericEls: genericEls
    };

    this.onChange = this.onChange.bind(this);
    this.onUserChange = this.onUserChange.bind(this);
    this.onPermissionChange = this.onPermissionChange.bind(this);

    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
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
      if (state.currentCollection) {
        PermissionActions.fetchPermissionStatus(state);
      }
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
    const { id } = currentCollection;
    return this.state.currentCollection.id !== id;
  }

  showModal(type) {
    this.setState({ showModalOfType: type });
  }

  hideModal() {
    this.setState({ showModalOfType: null });
  }

  renderTopSecretModal() {
    return (
      <Modal
        centered
        show={true}
        onHide={this.hideModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Sharing not allowed</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          One of the selected elements contains one or several samples marked as top secret.
        </Modal.Body>
      </Modal>
    );
  }

  renderModal() {
    const { showModalOfType, is_top_secret } = this.state;
    switch (showModalOfType) {
      case 'share':
        return is_top_secret
          ? this.renderTopSecretModal()
          : <ManagingModalSharing onHide={this.hideModal} />;

      case 'move':
        return <ManagingModalCollectionActions
          title="Move to Collection"
          action="move"
          withShared={true}
          onHide={this.hideModal}
        />;

      case 'assign':
        return <ManagingModalCollectionActions
          title="Assign to Collection"
          action="assign"
          withShared={false}
          onHide={this.hideModal}
        />;

      case 'remove':
        return <ManagingModalRemove onHide={this.hideModal} />;

      case 'delete':
        return <ManagingModalDelete onHide={this.hideModal} />;

      default:
        return null;
    }
  }

  render() {
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
      <>
        <ButtonGroup>
          <DropdownButton
            as={ButtonGroup}
            variant="success"
            title={<i className="fa fa-arrow-right" />}
            id="move-or-assign-btn"
            disabled={assignDisabled && moveDisabled}
          >
            <Dropdown.Item
              onClick={() => this.showModal('move')}
              disabled={moveDisabled}
            >
              Move to Collection
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => this.showModal('assign')}
              disabled={assignDisabled}
            >
              Assign to Collection
            </Dropdown.Item>
          </DropdownButton>

          <DropdownButton
            as={ButtonGroup}
            variant="warning"
            title={<i className="fa fa-minus-square" />}
            id="remove-or-delete-btn"
            disabled={removeDisabled && deleteDisabled}
          >
            <Dropdown.Item
              onClick={() => this.showModal('remove')}
              disabled={removeDisabled}
            >
              Remove from current Collection
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => this.showModal('delete')}
              disabled={deleteDisabled}
            >
              Remove from all Collections
            </Dropdown.Item>
          </DropdownButton>

          <Button
            variant="info"
            id="share-btn"
            disabled={shareDisabled}
            onClick={() => this.showModal('share')}
          >
            <i className="fa fa-share-alt" />
          </Button>
        </ButtonGroup>

        {this.renderModal()}
      </>
    );
  }
}
