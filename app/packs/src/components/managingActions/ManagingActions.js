import React from 'react';
import { Dropdown, DropdownButton, Button, ButtonGroup, Modal } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { List } from 'immutable';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import PermissionStore from 'src/stores/alt/stores/PermissionStore';
import PermissionActions from 'src/stores/alt/actions/PermissionActions';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import ManagingModalCollectionActions from 'src/components/managingActions/ManagingModalCollectionActions';
import ManagingModalDelete from 'src/components/managingActions/ManagingModalDelete';
import ManagingModalRemove from 'src/components/managingActions/ManagingModalRemove';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { elementNames } from 'src/apps/generic/Utils';

const upState = async (state) => {
  const { sample, reaction, screen, wellplate, research_plan, cell_line } = state;
  const stateObj = {
    sample: {
      checkedAll: sample ? sample.checkedAll : false,
      checkedIds: sample ? sample.checkedIds : List(),
      uncheckedIds: sample ? sample.uncheckedIds : List(),
    },
    reaction: {
      checkedAll: reaction ? reaction.checkedAll : false,
      checkedIds: reaction ? reaction.checkedIds : List(),
      uncheckedIds: reaction ? reaction.uncheckedIds : List(),
    },
    wellplate: {
      checkedAll: wellplate ? wellplate.checkedAll : false,
      checkedIds: wellplate ? wellplate.checkedIds : List(),
      uncheckedIds: wellplate ? wellplate.uncheckedIds : List(),
    },
    screen: {
      checkedAll: screen ? screen.checkedAll : false,
      checkedIds: screen ? screen.checkedIds : List(),
      uncheckedIds: screen ? screen.uncheckedIds : List(),
    },
    research_plan: {
      checkedAll: research_plan ? research_plan.checkedAll : false,
      checkedIds: research_plan ? research_plan.checkedIds : List(),
      uncheckedIds: research_plan ? research_plan.uncheckedIds : List(),
    },
    cell_line: {
      checkedAll: cell_line ? cell_line.checkedAll : false,
      checkedIds: cell_line ? cell_line.checkedIds : List(),
      uncheckedIds: cell_line ? cell_line.uncheckedIds : List(),
    }
  };

  // eslint-disable-next-line no-unused-expressions
  const klassArray = await elementNames(false);
  klassArray.forEach((klass) => {
    stateObj[`${klass}`] = {
      checkedAll: state[`${klass}`] ? state[`${klass}`].checkedAll : false,
      checkedIds: state[`${klass}`] ? state[`${klass}`].checkedIds : List(),
      uncheckedIds: state[`${klass}`] ? state[`${klass}`].uncheckedIds : List(),
    };
  });
  //  }
  return (stateObj);
};

export default class ManagingActions extends React.Component {
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
      genericEls: []
    };

    this.onChange = this.onChange.bind(this);
    this.onUserChange = this.onUserChange.bind(this);
    this.onPermissionChange = this.onPermissionChange.bind(this);

    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);

    this.initializeAsyncState();
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
    } else if (this.checkUIState(state)) {
      const klassArray = await elementNames(true);
      const hasSel = klassArray.some((el) => (state[el] && (state[el].checkedIds.size > 0 || state[el].checkedAll)));
      PermissionActions.fetchPermissionStatus(state);
      const upStateResult = await upState(state);
      this.setState({
        ...upStateResult, hasSel
      });
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

  async initializeAsyncState() {
    const upStateResult = await upState({});
    this.setState({ ...upStateResult });
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

  checkUIState(state) {
    const genericNames = (this.state.genericEls && this.state.genericEls.map(el => el.name)) || [];
    const elNames = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan', 'cell_line'].concat(genericNames);
    const result = elNames.find(el => (this.state[el] && state[el] && (
      state[el].checkedIds !== this.state[el].checkedIds ||
      state[el].checkedAll !== this.state[el].checkedAll ||
      state[el].uncheckedIds !== this.state[el].uncheckedIds
    )));
    return result;
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
          action={ElementActions.updateElementsCollection}
          listSharedCollections={true}
          onHide={this.hideModal}
        />;

      case 'assign':
        return <ManagingModalCollectionActions
          title="Assign to Collection"
          action={ElementActions.assignElementsCollection}
          listSharedCollections={false}
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
      <>
        <ButtonGroup className="d-flex align-items-center">
          <DropdownButton
            as={ButtonGroup}
            variant={customClass ? null : 'success'}
            className={customClass}
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
            variant={customClass ? null : 'warning'}
            className={customClass}
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
            variant={customClass ? null : 'info'}
            id="share-btn"
            disabled={shareDisabled}
            onClick={() => this.showModal('share')}
            className={customClass}
          >
            <i className="fa fa-share-alt" />
          </Button>
        </ButtonGroup>

        {this.renderModal()}
      </>
    );
  }
}

ManagingActions.propTypes = {
  customClass: PropTypes.string,
  genericEls: PropTypes.array
};

ManagingActions.defaultProps = {
  customClass: null,
  genericEls: []
};
