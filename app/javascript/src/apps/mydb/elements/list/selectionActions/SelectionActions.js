import React from 'react';
import { Dropdown, Button, Modal } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import PermissionStore from 'src/stores/alt/stores/PermissionStore';
import PermissionActions from 'src/stores/alt/actions/PermissionActions';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import SelectionTransferModal from 'src/apps/mydb/elements/list/selectionActions/SelectionTransferModal';
import SelectionDeleteModal from 'src/apps/mydb/elements/list/selectionActions/SelectionDeleteModal';
import SelectionRemoveModal from 'src/apps/mydb/elements/list/selectionActions/SelectionRemoveModal';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import SelectionSplitButton from 'src/apps/mydb/elements/list/selectionActions/SelectionSplitButton';
import SelectionGenerateButton from 'src/apps/mydb/elements/list/selectionActions/SelectionGenerateButton';
import SelectionExportButton from 'src/apps/mydb/elements/list/selectionActions/SelectionExportButton';
import { elementNames } from 'src/apps/generic/Utils';

export default class SelectionActions extends React.Component {
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
          : <SelectionShareModal onHide={this.hideModal} />;

      case 'move':
        return <SelectionTransferModal
          title="Move to Collection"
          action={ElementActions.updateElementsCollection}
          listSharedCollections={true}
          onHide={this.hideModal}
        />;

      case 'assign':
        return <SelectionTransferModal
          title="Assign to Collection"
          action={ElementActions.assignElementsCollection}
          listSharedCollections={false}
          onHide={this.hideModal}
        />;

      case 'remove':
        return <SelectionRemoveModal onHide={this.hideModal} />;

      case 'delete':
        return <SelectionDeleteModal onHide={this.hideModal} />;

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
      <div className="selection-actions d-flex align-items-center gap-1 mb-3">
        <SelectionGenerateButton />
        <SelectionExportButton />
        <SelectionSplitButton />
        <Dropdown id="move-or-assign-btn">
          <Dropdown.Toggle 
            variant="light"
            size="sm"
            disabled={assignDisabled && moveDisabled}
          >
            <i className="fa fa-exchange me-1" />
            <span className="selection-action-text-label">Transfer</span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
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
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown id="remove-or-delete-btn">
          <Dropdown.Toggle 
            variant="light"
            size="sm"
            disabled={removeDisabled && deleteDisabled}
          >
            <i className="fa fa-times-circle-o me-1" />
            <span className="selection-action-text-label">Remove</span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
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
          </Dropdown.Menu>
        </Dropdown>
        <Button
          variant="light"
          size="sm"
          id="share-btn"
          disabled={shareDisabled}
          onClick={() => this.showModal('share')}
        >
          <i className="fa fa-share-alt me-1" />
          <span className="selection-action-text-label">Share</span>
        </Button>

        {this.renderModal()}
      </div>
    );
  }
}
