/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import {
  OverlayTrigger,
  Popover,
  Button,
  Table,
  Tooltip,
  Overlay,
} from 'react-bootstrap';
import { observer } from 'mobx-react';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { AsyncSelect } from 'src/components/common/Select';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const GroupElement = ({ group, currentUser, onDeleteGroup, onDeleteUser, onUpdateGroup }) => {
  const [showUsers, setShowUsers] = useState(false);
  const [showRowAdd, setShowRowAdd] = useState(false);
  const [showAdminAlert, setShowAdminAlert] = useState(false);
  const [showAdminRowAdd, setShowAdminRowAdd] = useState(false);
  const [adminPopoverTarget, setAdminPopoverTarget] = useState(null);
  const [usersToggled, setUsersToggled] = useState(false);
  const [rowAddToggled, setRowAddToggled] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedAdminUsers, setSelectedAdminUsers] = useState([]);

  const setGroupAdmin = (event, user, setAdmin = true) => {
    // if removing group admin and there is only one admin -> show warning
    if (!setAdmin && group.admins.length === 1) {
      setShowAdminAlert(true);
      setAdminPopoverTarget(event.target);
    }

    const request = setAdmin
      ? UsersFetcher.promoteAdmin(group.id, user.id)
      : UsersFetcher.demoteAdmin(group.id, user.id);

    request.then(() => {
      setSelectedUsers([]);
      onUpdateGroup();
    });
  };

  const hideAdminAlert = () => { setShowAdminAlert(false); };

  const toggleUsers = () => {
    setShowUsers(!showUsers);
    setUsersToggled(!usersToggled);
  };

  const toggleRowAdd = () => {
    setShowRowAdd(!showRowAdd);
    setRowAddToggled(!rowAddToggled);
  };

  const toggleAdminRowAdd = () => {
    setShowAdminRowAdd(!showAdminRowAdd);
  };

  const loadUserByName = (input) => {
    if (!input) return Promise.resolve([]);

    return UsersFetcher.fetchUsersByName(input, 'Person')
      .then((res) => selectUserOptionFormater({ data: res }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  // confirm action after pressing yes
  // if type is group, call deleteGroup api, if type is user, call deleteUser api
  const confirmDelete = (event, type, groupRec, userRec) => {
    if (type === 'group') {
      onDeleteGroup(groupRec.id);
    }
    if (type === 'user') {
      // Membership and admin status are independent: removing someone as a member
      // must never affect their admin status, so this never touches groupRec.admins
      // or fires a demote call. An admin who is also a member keeps their admin role
      // (now as a non-member admin) after being removed here.
      onDeleteUser(groupRec, userRec);
    }
    return null;
  };

  // add multiple users
  // replace with response result and then setState (with forceUpdate)
  const addUser = () => {
    const userIds = [];

    selectedUsers.forEach((g) => {
      // check if user is already in group
      const isUserInGroup = group.users.some((user) => user.id === g.value);

      // only add users not already in group
      if (!isUserInGroup) { userIds.push(g.value); }
    });

    UsersFetcher.addMembers(group.id, userIds).then(() => {
      setSelectedUsers([]);
      onUpdateGroup();
    });
  };

  // promote users to admin without requiring them to be a member first; reuses
  // setGroupAdmin so the admin list is updated the same way a per-row promote is
  const addAdmin = (groupRec) => {
    selectedAdminUsers.forEach((u) => {
      const isAlreadyAdmin = groupRec.admins.some((admin) => admin.id === u.value);
      if (!isAlreadyAdmin) {
        setGroupAdmin(null, groupRec, { id: u.value, name: u.name, initials: u.initials }, true);
      }
    });

    setSelectedAdminUsers([]);
  };

  const renderDeleteButton = (type, groupRec, userRec, tooltipText) => {
    let msg = 'Leave this group?';
    if (type === 'user') {
      if (userRec.id === currentUser.id) {
        msg = 'Leave this group?';
      } else {
        msg = `Remove ${userRec.name}?`;
      }
    } else {
      msg = 'Remove group?';
    }

    // eslint-disable-next-line react/display-name
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        <Popover.Body>
          {msg}
          <div className="mt-2 d-flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={(event) => confirmDelete(event, type, groupRec, userRec)}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant="warning"
            >
              No
            </Button>
          </div>
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger
        animation
        placement="right"
        root
        trigger="focus"
        overlay={popover}
      >
        <Button
          size="sm"
          type="button"
          variant="danger"
          title={tooltipText}
        >
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    );
  };

  const renderAdminButtons = () => {
    const isAdmin = group.admins && group.admins
      .some((admin) => admin.id === currentUser.id);

    return (
      <>
        <div className="d-flex gap-1 align-items-center">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>View users</Tooltip>}
          >
            <Button
              size="sm"
              type="button"
              variant="info"
              onClick={toggleUsers}
            >
              <i className="fa fa-list" />
            </Button>
          </OverlayTrigger>
          {isAdmin && (
            <>
              <OverlayTrigger placement="top" overlay={<Tooltip>Add user</Tooltip>}>
                <Button
                  size="sm"
                  type="button"
                  variant="success"
                  onClick={toggleRowAdd}
                >
                  <i className="fa fa-plus" />
                </Button>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={<Tooltip>Add admin</Tooltip>}>
                <Button
                  size="sm"
                  type="button"
                  variant="warning"
                  onClick={toggleAdminRowAdd}
                >
                  <i className="fa fa-key" />
                </Button>
              </OverlayTrigger>
              {renderDeleteButton('group', group, undefined, 'Remove group')}
            </>
          )}
        </div>
        {isAdmin && showRowAdd && (
          <div className="d-flex mt-2 align-items-center gap-2">
            <AsyncSelect
              className="w-50"
              isMulti
              value={selectedUsers}
              matchProp="name"
              placeholder="Select users"
              loadOptions={loadUserByName}
              onChange={(userSelection) => setSelectedUsers(userSelection)}
            />
            <Button
              size="sm"
              type="button"
              variant="success"
              onClick={addUser}
              disabled={!selectedUsers || selectedUsers.length === 0}
            >
              <i className="fa fa-user-plus" />
            </Button>
          </div>
        )}
        {isAdmin && showAdminRowAdd && (
          <div className="d-flex mt-2 align-items-center gap-2">
            <AsyncSelect
              className="w-50"
              isMulti
              value={selectedAdminUsers}
              matchProp="name"
              placeholder="Select users to make admin"
              loadOptions={this.loadUserByName}
              onChange={(selected) => setSelectedAdminUsers(selected)}
            />
            <Button
              size="sm"
              type="button"
              variant="warning"
              onClick={() => addAdmin()}
              disabled={!selectedAdminUsers || selectedAdminUsers.length === 0}
            >
              <i className="fa fa-key" />
            </Button>
          </div>
        )}
      </>
    );
  };

  const renderUserButtons = (userRec) => {
    const isAdmin = group.admins && group.admins.some((a) => a.id === userRec.id);
    const isCurrentUserAdmin = group.admins
      && group.admins.some((a) => a.id === currentUser.id);
    const canDelete = isCurrentUserAdmin || userRec.id === currentUser.id;

    const adminButtonStyle = isAdmin ? 'warning' : 'light';
    const adminTooltip = isAdmin ? 'Demote from Admin' : 'Promote to Admin';

    return (
      <div className="d-flex gap-1 align-items-center">
        {isCurrentUserAdmin && (
          <OverlayTrigger placement="top" overlay={<Tooltip>{adminTooltip}</Tooltip>}>
            <Button
              size="sm"
              type="button"
              variant={adminButtonStyle}
              onClick={(event) => setGroupAdmin(event, group, userRec, !isAdmin)}
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
        )}
        {canDelete && renderDeleteButton('user', group, userRec, 'Remove')}
      </div>
    );
  };

  // Admins are listed regardless of membership. A non-member admin has no row in the
  // (member-only) users table below, so their demote control lives here instead of in
  // renderUserButtons - otherwise the only way to demote them would be adding them as a
  // member first, demoting, then removing membership again.
  const renderAdminList = () => {
    const isCurrentUserAdmin = group.admins.some((a) => a.id === currentUser.id);

    return group.admins.map((admin) => {
      const isMember = group.users.some((u) => u.id === admin.id);

      return (
        <span
          key={`admin_${group.id}_${admin.id}`}
          className="d-inline-flex align-items-center gap-1 me-2"
        >
          {admin.name}
          {isCurrentUserAdmin && !isMember && (
            <OverlayTrigger placement="top" overlay={<Tooltip>Demote from Admin</Tooltip>}>
              <Button
                size="sm"
                type="button"
                variant="warning"
                onClick={(event) => setGroupAdmin(event, group, admin, false)}
              >
                <i className="fa fa-key" />
              </Button>
            </OverlayTrigger>
          )}
        </span>
      );
    });
  };

  return (
    <tbody>
      <tr className="fw-bold align-middle">
        <td>{group.name}</td>
        <td>{group.initials}</td>
        <td>
          {renderAdminList()}
        </td>
        <td>
          {renderAdminButtons()}
        </td>
      </tr>
      {showUsers && (
        <tr>
          <td colSpan="4">
            <Table striped>
              <tbody>
                {group.users.map((u) => (
                  <tr key={`row_${group.id}_${u.id}`}>
                    <td width="20%">{u.name}</td>
                    <td width="30%">{u.initials}</td>
                    <td width="50%">{renderUserButtons(u)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </td>
        </tr>
      )}
      <Overlay
        show={showAdminAlert}
        target={adminPopoverTarget}
        placement="left"
        containerPadding={20}
      >
        <Popover>
          <Popover.Body>
            At least one admin is required.
            <div className="mt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={hideAdminAlert}
              >
                Got it!
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>
    </tbody>
  );
};

export default observer(GroupElement);
