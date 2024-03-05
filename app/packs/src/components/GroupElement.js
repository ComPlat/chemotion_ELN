import React from 'react';
import { ButtonGroup, OverlayTrigger, Popover, Nav, NavDropdown, NavItem, MenuItem, Glyphicon, Modal, Button, Table, Panel, Form, FormControl, FormGroup, ControlLabel, Col, Row } from 'react-bootstrap';
import UsersFetcher from './fetchers/UsersFetcher';
import Select from 'react-select';
import _ from 'lodash';

export default class GroupElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentState.currentUser || { name: 'unknown' },
      showUsers: false,
      showRowAdd: false,
      currentGroups: props.currentState.currentGroups
    };

    this.toggleUsers = this.toggleUsers.bind(this);
    this.toggleRowAdd = this.toggleRowAdd.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  toggleUsers() {
    this.setState({
      showUsers: !this.state.showUsers
    })
  }

  toggleRowAdd() {
    this.setState({
      showRowAdd: !this.state.showRowAdd
    })
  }

  handleSelectUser(val) {
    if (val) {
      this.setState({ selectedUsers: val });
    }
  }

  loadUserByName(input) {
    if (!input) {
      return Promise.resolve({ options: [] });
    }

    return UsersFetcher.fetchUsersByName(input)
      .then((res) => {
        let usersEntries = res.users.filter(u => u.user_type === 'Person')
          .map((u) => {
            return {
              value: u.id,
              name: u.name,
              label: u.name + " (" + u.abb + ")"
            }
          });
        return { options: usersEntries };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  renderDeleteButton(type, groupRec, userRec) {
    let msg = 'remove yourself from the group';
    if (type === 'user') {
      if (userRec.id === this.state.currentUser.id) {
        msg = 'remove yourself from the group';
      } else {
        msg = `remove user: ${userRec.name}`;
      }
    } else {
      msg = `remove group: ${groupRec.name}`;
    }

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg} ?<br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.confirmDelete(type, groupRec, userRec)}>
            Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.handleClick} >
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
          <Button bsSize="xsmall" bsStyle="danger" >
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }

  renderAdminButtons(group) {
    const { selectedUsers, showRowAdd } = this.state;
    if (group.admins && group.admins.length > 0 && group.admins[0].id === this.state.currentUser.id) {
      return (
        <td>
          <Button bsSize="xsmall" type="button" bsStyle="info" className="fa fa-list" onClick={this.toggleUsers} />&nbsp;&nbsp;
          <Button bsSize="xsmall" type="button" bsStyle="success" className="fa fa-plus" onClick={this.toggleRowAdd} />&nbsp;&nbsp;
          {this.renderDeleteButton('group', group)}
          <span className={'collapse' + (showRowAdd ? 'in' : '')}>
            <Select.AsyncCreatable
              multi
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
            <Button bsSize="xsmall" type="button" bsStyle="warning" onClick={() => this.addUser(group)}>Save to group</Button>
          </span>
        </td>
      );
    }
    return (
      <td><Button bsSize="xsmall" type="button" bsStyle="info" className="fa fa-list" onClick={this.toggleUsers} /></td>
    );
  }

  renderUserButtons(groupRec, userRec = null) {
    if ((groupRec.admins && groupRec.admins.length > 0 && groupRec.admins[0].id === this.state.currentUser.id) || userRec.id === this.state.currentUser.id) {
      return this.renderDeleteButton('user', groupRec, userRec);
    }
    return (<div />);
  }

  // confirm action after pressing yes
  // if type is group, call deleteGroup api, if type is user, call deleteUser api
  confirmDelete(type, groupRec, userRec) {
    switch (type) {
      case 'group':
        this.deleteGroup(groupRec);
        break;
      case 'user':
        this.deleteUser(groupRec, userRec);
        break;
      default:
        break;
    }
  }

  // add multiple users
  // replace with response result and then setState (with forceUpdate)
  addUser(groupRec) {
    const { selectedUsers, currentGroups } = this.state;

    const userIds = [];
    selectedUsers.map((g) => {
      userIds.push(g.value);
      return true;
    });

    UsersFetcher.updateGroup({ id: groupRec.id, destroy_group: false, add_users: userIds })
      .then((group) => {
        const idx = _.findIndex(currentGroups, function (o) { return o.id == group.group.id; });
        currentGroups.splice(idx, 1, group.group);
        this.setState({ selectedUsers: null });
        this.props.onChangeData(currentGroups);
      });
  }

  // delete a user
  // replace with response result and then setState
  deleteUser(groupRec, userRec) {
    let { currentGroups } = this.state;
    const { currentUser } = this.state;

    UsersFetcher.updateGroup({ id: groupRec.id, destroy_group: false, rm_users: [userRec.id] })
      .then((result) => {
        const findIdx = _.findIndex(result.group.users, function (o) { return o.id == currentUser.id; });
        const findAdmin = _.findIndex(result.group.admins, function (o) { return o.id == currentUser.id; });
        if (findIdx == -1 && findAdmin == -1) {
          currentGroups = _.filter(this.state.currentGroups, o => o.id != result.group.id);
        } else {
          const idx = _.findIndex(currentGroups, function (o) { return o.id == result.group.id; });
          currentGroups.splice(idx, 1, result.group);
        }

        this.props.onChangeData(currentGroups);
      });
  }

  // delete a group
  // filter out the deleted group and then setState
  deleteGroup(groupRec) {
    UsersFetcher.updateGroup({ id: groupRec.id, destroy_group: true })
      .then((group) => {
        this.props.onChangeData(_.filter(this.state.currentGroups, o => o.id != group.destroyed_id));
      });
  }

  render() {
    const { groupElement } = this.props;
    const { showUsers: showInfo } = this.state;
    return (
      <tbody key={`tbody_${groupElement.id}`}>
        <tr key={`row_${groupElement.id}`} style={{ fontWeight: 'bold' }}>
          <td>{groupElement.name}</td>
          <td>{groupElement.initials}</td>
          <td>{groupElement.admins && groupElement.admins.length > 0 && groupElement.admins[0].name}</td>
          {this.renderAdminButtons(groupElement)}
        </tr>
        <tr className={'collapse' + (showInfo ? 'in' : '')}>
          <td colSpan="4">
            <Table>
              <tbody>
                {groupElement.users.map(u => (
                  <tr key={`row_${groupElement.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                    <td width="20%">{u.name}</td>
                    <td width="10%">{u.initials}</td>
                    <td width="20%"></td>
                    <td width="50%">{this.renderUserButtons(groupElement, u)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </td>
        </tr>
      </tbody>);
  }
}
