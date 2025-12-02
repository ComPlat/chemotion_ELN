import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Modal } from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';

import SharingShortcuts from 'src/components/managingActions/SharingShortcuts';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import { selectUserOptionFormater } from 'src/utilities/selectHelper';
import { filterParamsFromUIState } from 'src/utilities/collectionUtilities';

const defaultProps = {
  title: 'Sharing of Elements',
  collectionId: null,
  collectionShareId: null,
  shareType: "new",
  collectionPermissions: {
    permissionLevel: 0,
    sampleDetailLevel: 0,
    reactionDetailLevel: 0,
    wellplateDetailLevel: 0,
    screenDetailLevel: 0,
    elementDetailLevel: 10
  },
  showUserSelect: true,
};

const ManagingModalSharing = (props) => {
  const { title, collectionId, collectionShareId, shareType, collectionPermissions, showUserSelect, onHide } = { ...defaultProps, ...props }

  const collectionsStore = useContext(StoreContext).collections;
  const [permissions, setPermissions] = useState(collectionPermissions);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const defaultRole = 'Pick a sharing role';
  const [role, setRole] = useState(defaultRole);

  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const uiState = UIStore.getState();
  const displayWarning = permissions.permissionLevel === '5';
  const canSubmit = !showUserSelect || selectedUsers != null && selectedUsers.length > 0
  const submitTitle = shareType == 'edit' ? 'Edit Permissions' : 'Create Shared Collection';

  const handleSharing = () => {
    const permissionsParams = {
      permission_level: permissions.permissionLevel,
      element_detail_level: permissions.elementDetailLevel,
      reaction_detail_level: permissions.reactionDetailLevel,
      sample_detail_level: permissions.sampleDetailLevel,
      screen_detail_level: permissions.screenDetailLevel,
      wellplate_detail_level: permissions.wellplateDetailLevel,
      celllinesample_detail_level: 10,
      devicedescription_detail_level: 10,
      sequencebasedmacromoleculesample_detail_level: 10,
      researchplan_detail_level: 10,
    }

    if (shareType === 'new') {
      // create new collection with shared elements
      const params = {
        uiState: filterParamsFromUIState(uiState),
        users: selectedUsers,
        permissions: permissionsParams,
        currentUser: currentUser,
      };
      collectionsStore.collectionShareForElements(params)

    } else if (shareType === 'create') {
      // create collection share of collectionId
      const params = {
        collection_id: collectionId,
        user_ids: selectedUsers.map(u => u.id),
        ...permissionsParams
      }
      collectionsStore.addCollectionShare(params, currentUser, false);
    } else if (shareType === 'edit') {
      // edit permissions of collection share
      const params = {
        id: collectionShareId,
        ...permissionsParams
      }
      collectionsStore.updateCollectionShare(collectionShareId, params)
    }

    onHide();
  }

  const handleShortcutChange = (e) => {
    let val = e.target.value
    let permissionsAndDetailLevel = {}
    switch (val) {
      case 'user':
        permissionsAndDetailLevel = SharingShortcuts.user();
        break;
      case 'partner':
        permissionsAndDetailLevel = SharingShortcuts.partner();
        break;
      case 'collaborator':
        permissionsAndDetailLevel = SharingShortcuts.collaborator();
        break;
      case 'reviewer':
        permissionsAndDetailLevel = SharingShortcuts.reviewer();
        break;
      case 'supervisor':
        permissionsAndDetailLevel = SharingShortcuts.supervisor();
        break;
    }
    permissionsAndDetailLevel['elementDetailLevel'] = permissions.elementDetailLevel;
    setPermissions(permissionsAndDetailLevel);
    setRole(val);
  }

  const handlePermissionLevelChange = (e) => {
    let val = e.target.value;
    setPermissions({ ...permissions, permissionLevel: val });
    setRole(defaultRole);
  }

  const handleDetailLevelChange = (e, elementType) => {
    let val = e.target.value
    setPermissions({ ...permissions, [`${elementType}DetailLevel`]: val });
    setRole(defaultRole);
  }

  const handleSelectUser = (val) => {
    setSelectedUsers(val);
  }

  const loadUserByName = (input) => {
    if (!input) { return Promise.resolve([]) }

    return UsersFetcher.fetchUsersByName(input, 'Person,Group')
      .then((res) => selectUserOptionFormater(
        { data: res, withType: true, currentUserId: currentUser.id }
      )).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  const userSelect = () => {
    if (!showUserSelect) return null;

    return (
      <Form.Group className="mb-3">
        <Form.Label>Select Users to share with</Form.Label>
        <AsyncSelect
          id="share-users-select"
          isMulti
          value={selectedUsers}
          matchProp="name"
          loadOptions={loadUserByName}
          onChange={handleSelectUser}
        />
      </Form.Group>
    );
  }

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
              value={role || ''}
              onChange={(e) => handleShortcutChange(e)}>
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
              onChange={(e) => handlePermissionLevelChange(e)}
              value={permissions.permissionLevel || ''}>
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
              onChange={(e) => handleDetailLevelChange(e, 'sample')}
              value={permissions.sampleDetailLevel || ''}>
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
              onChange={(e) => handleDetailLevelChange(e, 'reaction')}
              value={permissions.reactionDetailLevel || ''}>
              <option value='0'>Observation, description, calculation</option>
              <option value='10'>Everything</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="wellplateDetailLevelSelect">
            <Form.Label>Wellplate detail level</Form.Label>
            <Form.Select
              onChange={(e) => handleDetailLevelChange(e, 'wellplate')}
              value={permissions.wellplateDetailLevel || ''}>
              <option value='0'>Wells (Positions)</option>
              <option value='1'>Readout</option>
              <option value='10'>Everything</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="screenDetailLevelSelect">
            <Form.Label>Screen detail level</Form.Label>
            <Form.Select
              onChange={(e) => handleDetailLevelChange(e, 'screen')}
              value={permissions.screenDetailLevel || ''}>
              <option value='0'>Name, description, condition, requirements</option>
              <option value='10'>Everything</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="elementDetailLevelSelect">
            <Form.Label>Element detail level</Form.Label>
            <Form.Select
              onChange={(e) => handleDetailLevelChange(e, 'element')}
              value={permissions.elementDetailLevel || ''}>
              <option value='10'>Everything</option>
            </Form.Select>
          </Form.Group>
          {userSelect()}
          <Button
            id="create-sync-shared-col-btn"
            variant="warning"
            disabled={!canSubmit}
            onClick={handleSharing}
          >
            {submitTitle}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default observer(ManagingModalSharing);

ManagingModalSharing.propTypes = {
  title: PropTypes.string,
  collectionId: PropTypes.number,
  collectionShareId: PropTypes.number,
  shareType: PropTypes.string,
  showUserSelect: PropTypes.bool,
  collectionPermissions: PropTypes.shape({
    permissionLevel: PropTypes.number,
    sampleDetailLevel: PropTypes.number,
    reactionDetailLevel: PropTypes.number,
    wellplateDetailLevel: PropTypes.number,
    screenDetailLevel: PropTypes.number,
    elementDetailLevel: PropTypes.number,
  }),
  onHide: PropTypes.func.isRequired,
};
