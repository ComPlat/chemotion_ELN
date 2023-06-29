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
import { _, findIndex, isEqual } from 'lodash';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

export default class GroupElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentState.currentUser || { name: 'unknown' },
      showUsers: false,
      showRowAdd: false,
      groups: [],
      selectedUsers: null,
      showAdminAlert: false,
      adminPopoverTarget: null,
    };

    this.toggleUsers = this.toggleUsers.bind(this);
    this.toggleRowAdd = this.toggleRowAdd.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.setGroupAdmin = this.setGroupAdmin.bind(this);
    this.hideAdminAlert = this.hideAdminAlert.bind(this);
  }

  componentDidMount() { }

  componentDidUpdate(prevProps, prevState) {
    if (!isEqual(prevState.selectedUsers, this.state.selectedUsers)) {
      this.loadUserByName();
    }
  }

  componentWillUnmount() { }

  handleSelectUser(val) {
    if (val) {
      this.setState({ selectedUsers: val });
    }
  }

  setGroupAdmin(groupRec, userRec, setAdmin = true) {
    // of removing admin rights and this is the only admin, show warning
    if (!setAdmin && groupRec.admins.length === 1) {
      this.setState({ showAdminAlert: true, adminPopoverTarget: event.target });
      return;
    }

    // confirm action if promoting user to admin
    if (setAdmin) {
      if (!window.confirm('Are you sure you want to make this user an admin?')) {
        return;
      }
    }

    const { groups } = this.state;
    const params = {
      action: 'NodeAdm',
      rootType: 'Group',
      actionType: 'Adm',
      id: groupRec.id,
      admin_id: userRec.id,
      set_admin: setAdmin,
    };
    AdminFetcher.updateGroup(params)
      .then((result) => {
        if (setAdmin) {
          groupRec.admins.splice(1, 0, userRec);
        } else {
          const usrIdx = findIndex(groupRec.admins, (o) => o.id === userRec.id);
          groupRec.admins.splice(usrIdx, 1);
        }
        const idx = findIndex(groups, (o) => o.id === groupRec.id);
        groups.splice(idx, 1, groupRec);
        this.setState({ groups }, () => {
          this.props.onChangeGroupData(groups);
        });
      })
      .catch((error) => {
        console.error('Error updating group: ', error);
      });
  }

  hideAdminAlert = () => {
    this.setState({ showAdminAlert: false });
  };

  toggleUsers() {
    this.setState((prevState) => ({
      showUsers: !prevState.showUsers,
    }));
  }

  toggleRowAdd() {
    this.setState((prevState) => ({
      showRowAdd: !prevState.showRowAdd,
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
    selectedUsers.map((g) => {
      userIds.push(g.value);
      return true;
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
          }}
        >
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            onClick={() => this.confirmDelete(type, groupRec, userRec)}
            style={{
              marginTop: '5px',
              textAlign: 'center',
              width: '35px',
              fontWeight: 'Bold',
            }}
          >
            Yes
          </Button>
          <Button
            bsSize="xsmall"
            bsStyle="warning"
            onClick={this.handleClick}
            style={{
              marginTop: '5px',
              textAlign: 'center',
              width: '35px',
              fontWeight: 'Bold',
            }}
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
            style={{
              width: '25px',
              height: '25px',
              marginRight: '10px',
              textAlign: 'center',
            }}
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
              style={{
                width: '25px',
                height: '25px',
                marginRight: '10px',
                textAlign: 'center',
              }}
              type="button"
              bsStyle="info"
              className="fa fa-list"
              onClick={this.toggleUsers}
            />
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Add user</Tooltip>}
          >
            <Button
              bsSize="xsmall"
              style={{
                width: '25px',
                height: '25px',
                marginRight: '10px',
                textAlign: 'center',
              }}
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
            {' '}
            <Select.AsyncCreatable
              multi
              style={{
                marginTop: '10px',
                width: '200px',
              }}
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
            />
            <Button
              bsSize="xsmall"
              type="button"
              style={{
                height: '25px',
                marginRight: '10px',
                marginTop: '10px',
                textAlign: 'center',
                fontWeight: 'Bold',
              }}
              bsStyle="warning"
              onClick={() => this.addUser(group)}
            >
              Add
            </Button>
          </span>
        </td>
      );
    }
    return (
      <td>
        <Button
          bsSize="xsmall"
          type="button"
          style={{
            width: '25px',
            height: '25px',
            marginRight: '10px',
            textAlign: 'center',
          }}
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
        <ButtonGroup className="actions">
          {isCurrentUserAdmin && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>{adminTooltip}</Tooltip>}
            >
              <Button
                bsSize="xsmall"
                style={{
                  width: '25px',
                  height: '25px',
                  marginRight: '10px',
                  textAlign: 'center',
                }}
                type="button"
                bsStyle={adminButtonStyle}
                className="fa fa-key"
                onClick={(e) => this.setGroupAdmin(groupRec, userRec, !isAdmin, e)}
              />
            </OverlayTrigger>
          )}
          {canDelete && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Remove</Tooltip>}
            >
              {this.renderDeleteButton('user', groupRec, userRec)}
            </OverlayTrigger>
          )}
        </ButtonGroup>
      </span>
    );
  }

  render() {
    const styles = {
      lightRow: {
        backgroundColor: '#e1edf2',
      },
      darkRow: {
        backgroundColor: '#c8d6dc',
      },
    };
    const { groupElement } = this.props;
    const { showUsers: showInfo } = this.state;
    return (
      <tbody key={`tbody_${groupElement.id}`}>
        <tr key={`row_${groupElement.id}`} style={{ fontWeight: 'Bold' }}>
          <td style={{ verticalAlign: 'middle' }}>{groupElement.name}</td>
          <td style={{ verticalAlign: 'middle' }}>{groupElement.initials}</td>
          <td style={{ verticalAlign: 'middle' }}>
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
                    style={
                      index % 2 === 0 ? styles.lightRow : styles.darkRow
                    }
                  >
                    <td width="20%" style={{ verticalAlign: 'middle' }}>
                      {u.name}
                    </td>
                    <td width="10%" style={{ verticalAlign: 'middle' }}>
                      {u.initials}
                    </td>
                    <td width="20%" style={{ verticalAlign: 'middle' }} />
                    <td width="50%" style={{ verticalAlign: 'middle' }}>
                      {this.renderUserButtons(groupElement, u)}
                    </td>
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
            There must be at least one admin.
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
              }}
            >
              <Button
                bsSize="xsmall"
                bsStyle="primary"
                onClick={this.hideAdminAlert}
                style={{
                  marginTop: '5px',
                  textAlign: 'center',
                  fontWeight: 'Bold',
                }}
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
