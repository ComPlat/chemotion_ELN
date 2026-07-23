import React from 'react';
import {
  OverlayTrigger,
  Popover,
  Button,
  Table,
  Tooltip,
  Overlay,
} from 'react-bootstrap';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { AsyncSelect } from 'src/components/common/Select';
import _ from 'lodash';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

export default class GroupElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showUsers: false,
      showRowAdd: false,
      showAdminRowAdd: false,
      showAdminAlert: false,
      adminPopoverTarget: null,
      usersToggled: false,
      rowAddToggled: false,
      adminRowAddToggled: false,
      selectedAdminUsers: [],
    };

    this.toggleUsers = this.toggleUsers.bind(this);
    this.toggleRowAdd = this.toggleRowAdd.bind(this);
    this.toggleAdminRowAdd = this.toggleAdminRowAdd.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.hideAdminAlert = this.hideAdminAlert.bind(this);
    this.setGroupAdmin = this.setGroupAdmin.bind(this);
    this.addAdmin = this.addAdmin.bind(this);
  }

  setGroupAdmin(event, groupRec, userRec, setAdmin = true) {
    // if removing group admin and there is only one admin -> show warning
    if (!setAdmin && groupRec.admins.length === 1) {
      this.setState({ showAdminAlert: true, adminPopoverTarget: event.target });
      return;
    }

    const request = setAdmin
      ? UsersFetcher.promoteAdmin(groupRec.id, userRec.id)
      : UsersFetcher.demoteAdmin(groupRec.id, userRec.id);

    request.then((group) => {
      if (setAdmin) {
        const usrIdx = _.findIndex(
          group.group.admins,
          (o) => o.id === userRec.id
        );
        // if user is not already admin
        if (usrIdx === -1) {
          group.group.admins.push(userRec);
        }
      } else {
        const usrIdx = _.findIndex(
          group.group.admins,
          (o) => o.id === userRec.id
        );
        // if user is already  admin
        if (usrIdx !== -1) {
          group.group.admins.splice(usrIdx, 1);
        }
      }
      const idx = _.findIndex(
        this.props.currentGroup,
        (o) => o.id === group.group.id
      );
      this.props.currentGroup.splice(idx, 1, group.group);
      this.setState({ selectedUsers: [] });
      this.props.onChangeData(this.props.currentGroup);
    });
  }

  hideAdminAlert = () => { this.setState({ showAdminAlert: false }); };

  toggleUsers() {
    this.setState((prevState) => ({
      showUsers: !prevState.showUsers,
      usersToggled: !prevState.usersToggled,
    }));
  }

  toggleRowAdd() {
    this.setState((prevState) => ({
      showRowAdd: !prevState.showRowAdd,
      rowAddToggled: !prevState.rowAddToggled,
    }));
  }

  toggleAdminRowAdd() {
    this.setState((prevState) => ({
      showAdminRowAdd: !prevState.showAdminRowAdd,
      adminRowAddToggled: !prevState.adminRowAddToggled,
    }));
  }

  loadUserByName(input) {
    if (!input) {
      return Promise.resolve([]);
    }

    return UsersFetcher.fetchUsersByName(input, 'Person')
      .then((res) => selectUserOptionFormater({ data: res }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  // confirm action after pressing yes
  // if type is group, call deleteGroup api, if type is user, call deleteUser api
  confirmDelete(event, type, groupRec, userRec) {
    switch (type) {
      case 'group':
        this.props.onDeleteGroup(groupRec.id);
        break;
      case 'user': {
        const userIsAdmin = groupRec.admins.some((admin) => admin.id === userRec.id);

        // Block before firing the request: removing the sole admin would leave the
        // group without one. GroupAPI refuses this with a 422 too, but checking here
        // avoids firing a doomed request and shows the warning immediately instead of
        // depending on the (unhandled) error response.
        if (userIsAdmin && groupRec.admins.length === 1) {
          this.setState({ showAdminAlert: true, adminPopoverTarget: event.target });
          return;
        }

        // GroupAPI's member-removal endpoint already revokes the admin relationship as
        // part of removing the member, so no separate demote call is needed here.
        this.props.onDeleteUser(groupRec, userRec);
        break;
      }
      default:
        break;
    }
  }

  // add multiple users
  // replace with response result and then setState (with forceUpdate)
  addUser(groupRec) {
    const { selectedUsers } = this.state;
    const userIds = [];

    selectedUsers.forEach((g) => {
      // check if user is already in group
      const isUserInGroup = groupRec.users.some((user) => user.id === g.value);

      // only add users not already in group
      if (!isUserInGroup) { userIds.push(g.value); }
    });

    UsersFetcher.addMembers(groupRec.id, userIds).then((group) => {
      const idx = _.findIndex(
        this.props.currentGroup,
        (o) => o.id == group.group.id
      );
      this.props.currentGroup.splice(idx, 1, group.group);
      this.setState({ selectedUsers: [] });
      this.props.onChangeData(this.props.currentGroup);
    });
  }

  // promote users to admin without requiring them to be a member first; reuses
  // setGroupAdmin so the admin list is updated the same way a per-row promote is
  addAdmin(groupRec) {
    const { selectedAdminUsers } = this.state;

    selectedAdminUsers.forEach((u) => {
      const isAlreadyAdmin = groupRec.admins.some((admin) => admin.id === u.value);
      if (!isAlreadyAdmin) {
        this.setGroupAdmin(null, groupRec, { id: u.value, name: u.name, initials: u.initials }, true);
      }
    });

    this.setState({ selectedAdminUsers: [] });
  }

  renderDeleteButton(type, groupRec, userRec) {
    const { currentUser } = this.props;
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

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        <Popover.Body>
          {msg}
          <div className="mt-2 d-flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={(event) => this.confirmDelete(event, type, groupRec, userRec)}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant="warning"
              onClick={this.handleClick}
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
        >
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderAdminButtons() {
    const { groupElement, currentUser } = this.props;
    const {
      showRowAdd, selectedUsers, showAdminRowAdd, selectedAdminUsers
    } = this.state;

    const isAdmin = groupElement.admins && groupElement.admins
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
              onClick={this.toggleUsers}
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
                  onClick={this.toggleRowAdd}
                >
                  <i className="fa fa-plus" />
                </Button>
              </OverlayTrigger>
              <OverlayTrigger placement="top" overlay={<Tooltip>Add admin</Tooltip>}>
                <Button
                  size="sm"
                  type="button"
                  variant="warning"
                  onClick={this.toggleAdminRowAdd}
                >
                  <i className="fa fa-key" />
                </Button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Remove group</Tooltip>}
              >
                {this.renderDeleteButton('group', groupElement)}
              </OverlayTrigger>
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
              loadOptions={this.loadUserByName}
              onChange={(selectedUsers) => this.setState({ selectedUsers })}
            />
            <Button
              size="sm"
              type="button"
              variant="success"
              onClick={() => this.addUser(groupElement)}
              disabled={!selectedUsers}
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
              onChange={(selectedAdminUsers) => this.setState({ selectedAdminUsers })}
            />
            <Button
              size="sm"
              type="button"
              variant="warning"
              onClick={() => this.addAdmin(groupElement)}
              disabled={!selectedAdminUsers}
            >
              <i className="fa fa-key" />
            </Button>
          </div>
        )}
      </>
    );
  }

  renderUserButtons(userRec) {
    const { groupElement: groupRec, currentUser } = this.props;
    const isAdmin = groupRec.admins && groupRec.admins.some((a) => a.id === userRec.id);
    const isCurrentUserAdmin = groupRec.admins
      && groupRec.admins.some((a) => a.id === currentUser.id);
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
              onClick={(event) => this.setGroupAdmin(event, groupRec, userRec, !isAdmin)}
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
        )}
        {canDelete && (
          <OverlayTrigger placement="top" overlay={<Tooltip>Remove</Tooltip>}>
            {this.renderDeleteButton('user', groupRec, userRec)}
          </OverlayTrigger>
        )}
      </div>
    );
  }

  render() {
    const { groupElement } = this.props;
    const { showUsers, showAdminAlert, adminPopoverTarget } = this.state;

    return (
      <tbody>
        <tr className="fw-bold align-middle">
          <td>{groupElement.name}</td>
          <td>{groupElement.initials}</td>
          <td>
            {groupElement.admins.map((admin) => admin.name).join(', ')}
          </td>
          <td>
            {this.renderAdminButtons()}
          </td>
        </tr>
        {showUsers && (
          <tr>
            <td colSpan="4">
              <Table striped>
                <tbody>
                  {groupElement.users.map((u) => (
                    <tr key={`row_${groupElement.id}_${u.id}`}>
                      <td width="20%">{u.name}</td>
                      <td width="30%">{u.initials}</td>
                      <td width="50%">{this.renderUserButtons(u)}</td>
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
                  onClick={this.hideAdminAlert}
                >
                  Got it!
                </Button>
              </div>
            </Popover.Body>
          </Popover>
        </Overlay>
      </tbody>
    );
  }
}
