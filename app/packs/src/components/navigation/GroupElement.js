import React from 'react';
import {
  ButtonGroup,
  OverlayTrigger,
  Popover,
  Button,
  Table,
  Tooltip,
  Overlay,
} from 'react-bootstrap';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import Select from 'react-select';
import _ from 'lodash';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const styles = {
  button: {
    width: '25px', height: '25px', marginRight: '10px', textAlign: 'center',
  },
  popover: {
    display: 'flex', flexDirection: 'row', gap: '10px',
  },
  confirmButton: {
    marginTop: '5px', textAlign: 'center', width: '35px', fontWeight: 'Bold',
  },
  gotItButton: {
    marginTop: '5px', textAlign: 'center', fontWeight: 'Bold',
  },
  addUserButton: {
    marginLeft: '10px', marginTop: '5px', textAlign: 'center', width: '25px', height: '25px',
  },
  select: {
    marginTop: '5px', width: '300px',
  },
  flexRow: {
    display: 'flex', flexDirection: 'row', alignItems: 'center'
  },
  lightRow: {
    backgroundColor: '#e1edf2',
  },
  darkRow: {
    backgroundColor: '#c8d6dc',
  },
  tableData: {
    verticalAlign: 'middle'
  }
};

export default class GroupElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentState.currentUser || { name: 'unknown' },
      showUsers: false,
      showRowAdd: false,
      showAdminAlert: false,
      adminPopoverTarget: null,
      usersToggled: false,
      rowAddToggled: false,
    };

    this.toggleUsers = this.toggleUsers.bind(this);
    this.toggleRowAdd = this.toggleRowAdd.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.hideAdminAlert = this.hideAdminAlert.bind(this);
    this.setGroupAdmin = this.setGroupAdmin.bind(this);
  }

  componentDidMount() { }

  componentWillUnmount() { }

  handleSelectUser(val) {
    if (val && val.length > 0) { this.setState({ selectedUsers: val }); }
    else { this.setState({ selectedUsers: null }); }
  }

  setGroupAdmin(groupRec, userRec, setAdmin = true) {
    // if removing group admin and there is only one admin -> show warning
    if (!setAdmin && groupRec.admins.length === 1) {
      this.setState({ showAdminAlert: true, adminPopoverTarget: event.target });
      return;
    }

    // const { groups } = this.state;
    const params = {
      id: groupRec.id,
      add_admin: setAdmin ? [userRec.id] : [],
      rm_admin: !setAdmin ? [userRec.id] : [],
    };

    UsersFetcher.updateGroup(params).then((group) => {
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
      this.setState({ selectedUsers: null });
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

  loadUserByName(input) {
    if (!input) {
      return Promise.resolve({ options: [] });
    }

    return UsersFetcher.fetchUsersByName(input, 'Person')
      .then((res) => selectUserOptionFormater({ data: res }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  // confirm action after pressing yes
  // if type is group, call deleteGroup api, if type is user, call deleteUser api
  confirmDelete(type, groupRec, userRec) {
    switch (type) {
      case 'group':
        this.props.onDeleteGroup(groupRec.id);
        break;
      case 'user':
        this.props.onDeleteUser(groupRec, userRec);

        // check if the user being deleted is an admin.
        const userIsAdmin = groupRec.admins.some((admin) => admin.id === userRec.id);

        // if admin, remove admin status
        if (userIsAdmin) {
          this.setGroupAdmin(groupRec, userRec, false);
        }
        break;
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

    UsersFetcher.updateGroup({
      id: groupRec.id,
      destroy_group: false,
      add_users: userIds,
    }).then((group) => {
      const idx = _.findIndex(
        this.props.currentGroup,
        (o) => o.id == group.group.id
      );
      this.props.currentGroup.splice(idx, 1, group.group);
      this.setState({ selectedUsers: null });
      this.props.onChangeData(this.props.currentGroup);
    });
  }

  renderDeleteButton(type, groupRec, userRec) {
    let msg = 'Leave this group?';
    if (type === 'user') {
      if (userRec.id === this.state.currentUser.id) {
        msg = 'Leave this group?';
      } else {
        msg = `Remove ${userRec.name}?`;
      }
    } else {
      msg = 'Remove group?';
    }

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg}
        <div style={styles.popover}>
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            onClick={() => this.confirmDelete(type, groupRec, userRec)}
            style={styles.confirmButton}
          >
            Yes
          </Button>
          <Button
            bsSize="xsmall"
            bsStyle="warning"
            onClick={this.handleClick}
            style={styles.confirmButton}
          >
            No
          </Button>
        </div>
      </Popover>
    );

    return (
      <ButtonGroup className="actions">
        <OverlayTrigger
          animation
          placement="right"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button
            bsSize="xsmall"
            style={styles.button}
            type="button"
            bsStyle="danger"
            className="fa fa-trash-o"
            onClick={() => this.confirmDelete(groupRec, userRec)}
          />
        </OverlayTrigger>
      </ButtonGroup>
    );
  }

  renderAdminButtons(group) {
    const { selectedUsers, showRowAdd } = this.state;
    if (
      group.admins
      && group.admins.some((admin) => admin.id === this.state.currentUser.id)
    ) {
      return (
        <td>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>View users</Tooltip>}
          >
            <Button
              bsSize="xsmall"
              style={styles.button}
              type="button"
              bsStyle="info"
              className="fa fa-list"
              onClick={this.toggleUsers}
            />
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip>Add user</Tooltip>}>
            <Button
              bsSize="xsmall"
              style={styles.button}
              type="button"
              bsStyle="success"
              className="fa fa-plus"
              onClick={this.toggleRowAdd}
            />
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Remove group</Tooltip>}
          >
            {this.renderDeleteButton('group', group)}
          </OverlayTrigger>
          <span className={`collapse${showRowAdd ? 'in' : ''}`}>
            <div style={styles.flexRow}>
              {' '}
              <Select.AsyncCreatable
                multi
                style={styles.select}
                isLoading
                backspaceRemoves
                value={selectedUsers}
                valueKey="value"
                labelKey="label"
                matchProp="name"
                placeholder="Select users"
                promptTextCreator={this.promptTextCreator}
                loadOptions={this.loadUserByName}
                onChange={this.handleSelectUser}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && this.state.selectedUsers) {
                    this.addUser(group);
                  }
                }}
              />
              <Button
                bsSize="xsmall"
                type="button"
                style={styles.addUserButton}
                bsStyle="success"
                className="fa fa-user-plus"
                onClick={() => this.addUser(group)}
                disabled={!this.state.selectedUsers}
              />
            </div>
          </span>
        </td>
      );
    }
    return (
      <td>
        <Button
          bsSize="xsmall"
          type="button"
          style={styles.button}
          bsStyle="info"
          className="fa fa-list"
          onClick={this.toggleUsers}
        />
      </td>
    );
  }

  renderUserButtons(groupRec, userRec = null) {
    const isAdmin = groupRec.admins && groupRec.admins.some((a) => a.id === userRec.id);
    const isCurrentUserAdmin = groupRec.admins
      && groupRec.admins.some((a) => a.id === this.state.currentUser.id);
    const canDelete = isCurrentUserAdmin || userRec.id === this.state.currentUser.id;

    const adminButtonStyle = isAdmin ? 'warning' : 'default';
    const adminTooltip = isAdmin ? 'Demote from Admin' : 'Promote to Admin';

    return (
      <span>
        {isCurrentUserAdmin && (
          <OverlayTrigger placement="top" overlay={<Tooltip>{adminTooltip}</Tooltip>}>
            <Button
              bsSize="xsmall"
              style={styles.button}
              type="button"
              bsStyle={adminButtonStyle}
              className="fa fa-key"
              onClick={() => this.setGroupAdmin(groupRec, userRec, !isAdmin)}
            />
          </OverlayTrigger>
        )}
        {canDelete && (
          <OverlayTrigger placement="top" overlay={<Tooltip>Remove</Tooltip>}>
            {this.renderDeleteButton('user', groupRec, userRec)}
          </OverlayTrigger>
        )}
      </span>
    );
  }

  render() {
    const { groupElement } = this.props;
    const { showUsers: showInfo } = this.state;
    return (
      <tbody key={`tbody_${groupElement.id}`}>
        <tr key={`row_${groupElement.id}`} style={{ fontWeight: 'Bold' }}>
          <td style={styles.tableData}>{groupElement.name}</td>
          <td style={styles.tableData}>{groupElement.initials}</td>
          <td style={styles.tableData}>
            {groupElement.admins
              && groupElement.admins.length > 0
              && groupElement.admins.map((admin) => admin.name).join(', ')}
          </td>
          {this.renderAdminButtons(groupElement)}
        </tr>
        <tr className={`collapse${showInfo ? 'in' : ''}`}>
          <td colSpan="4">
            <Table>
              <tbody>
                {groupElement.users.map((u, index) => (
                  <tr
                    key={`row_${groupElement.id}_${u.id}`}
                    style={index % 2 === 0 ? styles.lightRow : styles.darkRow}
                  >
                    <td width="20%" style={styles.tableData}>{u.name}</td>
                    <td width="10%" style={styles.tableData}>{u.initials}</td>
                    <td width="20%" style={styles.tableData} />
                    <td width="50%" style={styles.tableData}>{this.renderUserButtons(groupElement, u)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </td>
        </tr>
        <Overlay
          show={this.state.showAdminAlert}
          target={this.state.adminPopoverTarget}
          placement="left"
          containerPadding={20}
        >
          <Popover id="popover-contained">
            At least one admin is required.
            <div style={styles.popover}>
              <Button
                bsSize="xsmall"
                bsStyle="primary"
                onClick={this.hideAdminAlert}
                style={styles.gotItButton}
              >
                Got it!
              </Button>
            </div>
          </Popover>
        </Overlay>
      </tbody>
    );
  }
}
