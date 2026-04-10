import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Modal } from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';

import SharingShortcuts from 'src/components/managingActions/SharingShortcuts';

import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';
import { elementNames, allElnElements } from 'src/apps/generic/Utils';

export default class ManagingModalSharing extends React.Component {

  constructor(props) {
    super(props);

    // TODO update for new check/uncheck info
    let { currentUser } = UserStore.getState();
    this.state = {
      currentUser: currentUser,
      role: 'Pick a sharing role',
      permissionLevel: props.permissionLevel,
      sampleDetailLevel: props.sampleDetailLevel,
      reactionDetailLevel: props.reactionDetailLevel,
      wellplateDetailLevel: props.wellplateDetailLevel,
      screenDetailLevel: props.screenDetailLevel,
      elementDetailLevel: props.elementDetailLevel,
      selectedUsers: null,
    }

    this.onUserChange = this.onUserChange.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.handleSharing = this.handleSharing.bind(this);

    this.loadUserByName = this.loadUserByName.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  onUserChange(state) {
    this.setState({
      currentUser: state.currentUser
    })
  }

  isElementSelectionEmpty(element) {
    return !element.checkedAll &&
      element.checkedIds.size == 0 &&
      element.uncheckedIds.size == 0;
  }

  isSelectionEmpty(uiState) {
    let isSampleSelectionEmpty = this.isElementSelectionEmpty(uiState.sample);
    let isReactionSelectionEmpty = this.isElementSelectionEmpty(uiState.reaction);
    let isWellplateSelectionEmpty = this.isElementSelectionEmpty(uiState.wellplate);
    let isScreenSelectionEmpty = this.isElementSelectionEmpty(uiState.screen);
    let isCelllineSelectionEmpty = this.isElementSelectionEmpty(uiState.cell_line);
    let isVesselSelectionEmpty = this.isElementSelectionEmpty(uiState.vessel);
    let isDeviceDescriptionSelectionEmpty = this.isElementSelectionEmpty(uiState.device_description);
    let isSequenceBasedMacromoleculeSampleSelectionEmpty = this.isElementSelectionEmpty(uiState.sequence_based_macromolecule_sample);

    let isElementSelectionEmpty = false;

    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericElement')) {

      // eslint-disable-next-line no-unused-expressions
      elementNames(false).then((klassArray) => {
        klassArray.forEach((klass) => {
          isElementSelectionEmpty = isElementSelectionEmpty && this.isElementSelectionEmpty(uiState[`${klass}`]);
        });
      });
    }

    return isSampleSelectionEmpty &&
      isReactionSelectionEmpty &&
      isWellplateSelectionEmpty &&
      isScreenSelectionEmpty &&
      isCelllineSelectionEmpty &&
      isVesselSelectionEmpty &&
      isDeviceDescriptionSelectionEmpty &&
      isSequenceBasedMacromoleculeSampleSelectionEmpty &&
      isElementSelectionEmpty;
  }

  filterParamsWholeCollection(uiState) {
    let collectionId = uiState.currentCollection.id;

    let filterParams = {
      currentSearchSelection: uiState.currentSearchSelection
    };

    allElnElements.map((element) => {
      filterParams[element] = {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: collectionId,
      };
    });

    elementNames(false).then((klassArray) => {
      klassArray.forEach((klass) => {
        filterParams[`${klass}`] = {
          all: true,
          included_ids: [],
          excluded_ids: [],
          collection_id: collectionId
        };
      });
    });

    return filterParams;
  }

  filterParamsFromUIState(uiState) {
    let collectionId = uiState.currentCollection.id;

    let filterParams = {
      currentSearchSelection: uiState.currentSearchSelection
    };

    allElnElements.map((element) => {
      filterParams[element] = {
        all: uiState[element].checkedAll,
        included_ids: uiState[element].checkedIds,
        excluded_ids: uiState[element].uncheckedIds,
        collection_id: collectionId,
      };
    });

    elementNames(false).then((klassArray) => {
      klassArray.forEach((klass) => {
        filterParams[`${klass}`] = {
          all: uiState[`${klass}`].checkedAll,
          included_ids: uiState[`${klass}`].checkedIds,
          excluded_ids: uiState[`${klass}`].uncheckedIds,
          collection_id: collectionId
        };
      });
    });

    return filterParams;
  }

  handleSharing() {
    const {
      permissionLevel, sampleDetailLevel, reactionDetailLevel,
      wellplateDetailLevel, screenDetailLevel, elementDetailLevel
    } = this.state;

    const params = {
      id: this.props.collectionId,
      collection_attributes: {
        permission_level: permissionLevel,
        sample_detail_level: sampleDetailLevel,
        reaction_detail_level: reactionDetailLevel,
        wellplate_detail_level: wellplateDetailLevel,
        screen_detail_level: screenDetailLevel,
        element_detail_level: elementDetailLevel
      },
    };

    if (this.props.collAction === "Create") {
      const uiState = UIStore.getState();
      const currentCollection = uiState.currentCollection;
      const filterParams =
        this.isSelectionEmpty(uiState)
          ? this.filterParamsWholeCollection(uiState)
          : this.filterParamsFromUIState(uiState);
      const fullParams = {
        ...params,
        elements_filter: filterParams,
        user_ids: this.state.selectedUsers,
        currentCollection
      };
      CollectionActions.createSharedCollections(fullParams);
    }

    if (this.props.collAction === 'Update') {
      CollectionActions.updateSharedCollection(params);
    }

    if (this.props.collAction === 'EditSync') {
      CollectionActions.editSync(params);
    }

    if (this.props.collAction === 'CreateSync') {
      const userIds = this.state.selectedUsers;
      const fullParams = {
        ...params,
        user_ids: userIds,
      };
      CollectionActions.createSync(fullParams);
    }

    this.props.onHide();
  }

  handleShortcutChange(e) {
    let val = e.target.value
    let permAndDetLevs = {}
    switch (val) {
      case 'user':
        permAndDetLevs = SharingShortcuts.user();
        break;
      case 'partner':
        permAndDetLevs = SharingShortcuts.partner();
        break;
      case 'collaborator':
        permAndDetLevs = SharingShortcuts.collaborator();
        break;
      case 'reviewer':
        permAndDetLevs = SharingShortcuts.reviewer();
        break;
      case 'supervisor':
        permAndDetLevs = SharingShortcuts.supervisor();
        break;
    }
    this.setState({ ...permAndDetLevs, role: val });
  }

  handlePLChange(e) {
    let val = e.target.value
    this.setState({
      role: 'Pick a sharing role',
      permissionLevel: val
    });
  }

  handleDLChange(e, elementType) {
    let val = e.target.value
    let state = {}
    state[elementType + 'DetailLevel'] = val
    state.role = 'Pick a sharing role'
    this.setState(state)
  }

  handleSelectUser(val) {
    this.setState({ selectedUsers: val })
  }

  loadUserByName(input) {
    let { selectedUsers } = this.state;

    if (!input) {
      return Promise.resolve([]);
    }

    return UsersFetcher.fetchUsersByName(input, 'Person,Group')
      .then((res) => selectUserOptionFormater(
        { data: res, withType: true, currentUserId: this.state.currentUser.id }
      )).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  selectUsers() {
    const { selectUsers } = this.props;
    if (!selectUsers) return null;

    let { selectedUsers } = this.state;

    return (
      <Form.Group className="mb-3">
        <Form.Label>Select Users to share with</Form.Label>
        <AsyncSelect
          id="share-users-select"
          isMulti
          value={selectedUsers}
          matchProp="name"
          loadOptions={this.loadUserByName}
          onChange={this.handleSelectUser}
        />
      </Form.Group>
    );
  }

  render() {
    const { selectUsers, onHide, title } = this.props;
    const { selectedUsers, permissionLevel = '' } = this.state;
    const displayWarning = permissionLevel === '5';

    const canSubmit = !selectUsers || selectedUsers != null && selectedUsers.length > 0

    return (
      <Modal show centered onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="shortcutSelect">
              <Form.Label>Role</Form.Label>
              <Form.Select
                placeholder="Pick a sharing role (optional)"
                value={this.state.role || ''}
                onChange={(e) => this.handleShortcutChange(e)}>
                <option value='Pick a sharing role'>Pick a sharing role (optional)</option>
                <option value='user'>User</option>
                <option value='partner'>Partner</option>
                <option value='collaborator'>Collaborator</option>
                <option value='reviewer'>Reviewer</option>
                <option value='supervisor'>Supervisor</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="permissionLevelSelect" id="permissionLevelSelect">
              <Form.Label>Permission level</Form.Label>
              <Form.Select
                onChange={(e) => this.handlePLChange(e)}
                value={this.state.permissionLevel || ''}>
                <option value='0'>Read</option>
                <option value='1'>Write</option>
                <option value='2'>Share</option>
                <option value='3'>Delete</option>
                <option value='4'>Import Elements</option>
                <option value='5'>Pass ownership</option>
              </Form.Select>
              {displayWarning && (
                <Form.Text>
                  <i className="fa fa-exclamation-circle ms-1" aria-hidden="true" />
                  Transfering ownership applies for all sub collections.
                </Form.Text>
              )}
            </Form.Group>
            <Form.Group className="mb-3" controlId="sampleDetailLevelSelect">
              <Form.Label>Sample detail level</Form.Label>
              <Form.Select
                onChange={(e) => this.handleDLChange(e, 'sample')}
                value={this.state.sampleDetailLevel || ''}>
                <option value='0'>Molecular mass of the compound, external label</option>
                <option value='1'>Molecule, structure</option>
                <option value='2'>Analysis Result + Description</option>
                <option value='3'>Analysis Datasets</option>
                <option value='10'>Everything</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="reactionDetailLevelSelect">
              <Form.Label>Reaction detail level</Form.Label>
              <Form.Select
                onChange={(e) => this.handleDLChange(e, 'reaction')}
                value={this.state.reactionDetailLevel || ''}>
                <option value='0'>Observation, description, calculation</option>
                <option value='10'>Everything</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="wellplateDetailLevelSelect">
              <Form.Label>Wellplate detail level</Form.Label>
              <Form.Select
                onChange={(e) => this.handleDLChange(e, 'wellplate')}
                value={this.state.wellplateDetailLevel || ''}>
                <option value='0'>Wells (Positions)</option>
                <option value='1'>Readout</option>
                <option value='10'>Everything</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="screenDetailLevelSelect">
              <Form.Label>Screen detail level</Form.Label>
              <Form.Select
                onChange={(e) => this.handleDLChange(e, 'screen')}
                value={this.state.screenDetailLevel || ''}>
                <option value='0'>Name, description, condition, requirements</option>
                <option value='10'>Everything</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="elementDetailLevelSelect">
              <Form.Label>Element detail level</Form.Label>
              <Form.Select
                onChange={(e) => this.handleDLChange(e, 'element')}
                value={this.state.elementDetailLevel || ''}>
                <option value='10'>Everything</option>
              </Form.Select>
            </Form.Group>
            {this.selectUsers()}
            <Button
              id="create-sync-shared-col-btn"
              variant="warning"
              disabled={!canSubmit}
              onClick={this.handleSharing}
            >
              {this.props.collAction} Shared Collection
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    )
  }
}

ManagingModalSharing.propTypes = {
  title: PropTypes.string,
  collectionId: PropTypes.number,
  collAction: PropTypes.string,
  selectUsers: PropTypes.bool,
  permissionLevel: PropTypes.number,
  sampleDetailLevel: PropTypes.number,
  reactionDetailLevel: PropTypes.number,
  wellplateDetailLevel: PropTypes.number,
  screenDetailLevel: PropTypes.number,
  elementDetailLevel: PropTypes.number,
  onHide: PropTypes.func.isRequired,
};

ManagingModalSharing.defaultProps = {
  title: 'Sharing',
  collectionId: null,
  collAction: "Create",
  selectUsers: true,
  permissionLevel: 0,
  sampleDetailLevel: 0,
  reactionDetailLevel: 0,
  wellplateDetailLevel: 0,
  screenDetailLevel: 0,
  elementDetailLevel: 10
};
