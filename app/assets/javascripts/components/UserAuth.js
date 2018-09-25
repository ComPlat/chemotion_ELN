import React, { Component } from 'react';
import PropTypes from 'prop-types'
import 'whatwg-fetch';
import { ButtonGroup, OverlayTrigger, Popover, Nav, NavDropdown, NavItem, MenuItem, Glyphicon, Modal, Button, Table, Panel, Form, FormControl, FormGroup, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';
import _ from 'lodash';

import UserActions from './actions/UserActions';
import UserStore from './stores/UserStore';
import Functions from './utils/Functions';
import UsersFetcher from './fetchers/UsersFetcher';
import MessagesFetcher from './fetchers/MessagesFetcher';
import NotificationActions from '../components/actions/NotificationActions';

export default class UserAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentUser || { name: 'unknown' },
      showModal: false,
      currentGroups: [],
      selectedUsers: null,
      showSubscription: false,
      currentSubscriptions: [],
    };

    this.onChange = this.onChange.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleSubscriptionShow = this.handleSubscriptionShow.bind(this);
    this.handleSubscriptionClose = this.handleSubscriptionClose.bind(this);

    this.promptTextCreator = this.promptTextCreator.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({
      currentUser: state.currentUser
    });
  }

  logout() {
    UserActions.logout();
  }

  promptTextCreator(label) {
    return ("Share with \"" + label + "\"");
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

  // show modal
  handleShow() {
    UsersFetcher.fetchCurrentGroup()
      .then((result) => {
        this.setState({
          currentGroups: result.currentGroups,
          showModal: true,
          selectedUsers: null
        });
      });
  }

  // hide modal
  handleClose() {
    this.setState({ showModal: false, selectedUsers: null });
  }

  // show modal Subscription
  handleSubscriptionShow() {
    MessagesFetcher.fetchChannelWithUser()
      .then((result) => {
        this.setState({
          showSubscription: true,
          currentSubscriptions: result.channels
        });
      });
  }

  // hide modal Subscription
  handleSubscriptionClose() {
    this.setState({ showSubscription: false });
  }

  // tooltip of yes/no confirmation
  handleClick() {
    this.setState({ show: !this.state.show });
  }

  handleSelectUser(val) {
    if (val) {
      this.setState({ selectedUsers: val });
    }
  }

  // inputs of create new group
  handleInputChange(type, ev) {
    switch (type) {
      case 'first':
        this.setState({ groupFirstName: ev.currentTarget.value });
        break;
      case 'last':
        this.setState({ groupLastName: ev.currentTarget.value });
        break;
      case 'abbr':
        this.setState({ groupAbbreviation: ev.currentTarget.value });
        break;
      default:
        break;
    }
  }

  subscribe(node) {
    const { currentSubscriptions } = this.state;

    MessagesFetcher.subscribeChannel({ channel_id: node.id, subscribe: node.user_id == null })
      .then((result) => {
        if (result.error) {
          // alert(result.error);
          NotificationActions.add({
            message: result.error,
            level: 'error'
          });
        } else {
          const actSubscription = _.filter(
            this.state.currentSubscriptions,
            o => o.id === result.channel_id
          );
          if (node.user_id != null) {
            actSubscription[0].user_id = null;
          } else {
            actSubscription[0].user_id = result.user_id;
          }
          const idx = _.findIndex(this.state.currentSubscriptions, o => o.id === result.channel_id);
          currentSubscriptions.splice(idx, 1, actSubscription[0]);
          this.setState({ currentSubscriptions });
        }
      });
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

  // create new group
  // need to use the wording 'group_param' because of the definition of current api
  createGroup() {
    const {
      groupFirstName, groupLastName, groupAbbreviation, currentUser, currentGroups
    } = this.state;
    const group_param = {
      first_name: groupFirstName,
      last_name: groupLastName,
      name_abbreviation: groupAbbreviation,
      users: [currentUser.id]
    };

    UsersFetcher.createGroup({ group_param })
      .then((result) => {
        if (result.error) {
          alert(result.error);
        } else {
          currentGroups.push(result.group);
          this.setState({
            currentGroups,
          });
        }
      });
  }

  // delete a group
  // filter out the deleted group and then setState
  deleteGroup(groupRec) {
    UsersFetcher.updateGroup({ id: groupRec.id, destroy_group: true })
      .then((group) => {
        this.setState({
          currentGroups: _.filter(this.state.currentGroups, o => o.id != group.destroyed_id),
        });
      });
  }

  // delete a user
  // replace with response result and then setState
  deleteUser(groupRec, userRec) {
    let { currentGroups } = this.state;
    const { currentUser } = this.state;

    UsersFetcher.updateGroup({ id: groupRec.id, destroy_group: false, rm_users: [userRec.id] })
      .then((result) => {
        const findIdx = _.findIndex(result.group.users, function(o) { return o.id == currentUser.id; });
        const findAdmin = _.findIndex(result.group.admins, function(o) { return o.id == currentUser.id; });
        if (findIdx == -1 && findAdmin == -1) {
          currentGroups = _.filter(this.state.currentGroups, o => o.id != result.group.id);
        } else {
          const idx = _.findIndex(currentGroups, function(o) { return o.id == result.group.id; });
          currentGroups.splice(idx, 1, result.group);
        }
        this.setState({ currentGroups });
      });
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
        const idx = _.findIndex(currentGroups, function(o) { return o.id == group.group.id; });
        currentGroups.splice(idx, 1, group.group);
        this.setState({ selectedUsers: null });

        const ve = document.getElementById(`row_add_${groupRec.id}`);
        if (ve.classList.contains('in')) {
          ve.classList.remove('in');
        }
      });
  }

  // render delete(icon-trash) button
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

  // render buttons if user is group's administrator
  renderAdminButtons(group) {
    const { selectedUsers } = this.state;
    if (group.admins[0].id === this.state.currentUser.id) {
      return (
        <td>
          <Button bsSize="xsmall" type="button" bsStyle="info" className="fa fa-list" data-toggle="collapse" data-target={`.div_row_${group.id}`} />&nbsp;&nbsp;
          <Button bsSize="xsmall" type="button" bsStyle="success" className="fa fa-plus" data-toggle="collapse" data-target={`.row_add_${group.id}`} />&nbsp;&nbsp;
          {this.renderDeleteButton('group', group)}
          <span className={`collapse row_add_${group.id}`} id={`row_add_${group.id}`}>
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
      <td><Button bsSize="xsmall" type="button" bsStyle="info" className="fa fa-list" data-toggle="collapse" data-target={`.div_row_${group.id}`} /></td>
    );
  }

  // render buttons for user
  renderUserButtons(groupRec, userRec = null) {
    if (groupRec.admins[0].id === this.state.currentUser.id || userRec.id === this.state.currentUser.id) {
      return this.renderDeleteButton('user', groupRec, userRec);
    }
    return (<div />);
  }

  // render modal
  renderModal() {
    const { showModal, currentGroups } = this.state;

    const modalStyle = {
      overflowY: 'auto',
    };

    let tbody = '';

    if (Object.keys(currentGroups).length <= 0) {
      tbody = '';
    } else {
      tbody = currentGroups.map(g => (
        <tbody key={`tbody_${g.id}`}>
          <tr key={`row_${g.id}`} id={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
            <td>{g.name}</td>
            <td>{g.initials}</td>
            <td>
              {g.admins[0].name}&nbsp;&nbsp;
            </td>
            { this.renderAdminButtons(g) }
          </tr>
          <tr className={`collapse div_row_${g.id}`} id={`div_row_${g.id}`}>
            <td colSpan="4">
              <Table>
                <tbody>
                  {g.users.map(u => (
                    <tr key={`row_${g.id}_${u.id}`} id={`row_${g.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                      <td width="20%">{u.name}</td>
                      <td width="10%">{u.initials}</td>
                      <td width="20%">{ }</td>
                      <td width="50%">
                        { this.renderUserButtons(g, u) }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </td>
          </tr>
        </tbody>
      ));
    }

    return (
      <Modal
        show={showModal}
        dialogClassName="importChemDrawModal"
        onHide={this.handleClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>My Groups</Modal.Title>
        </Modal.Header>
        <Modal.Body style={modalStyle}>
          <div>
            <Panel header="Create new group" bsStyle="success">
              <Form inline>
                <FormGroup controlId="formInlineName">
                  <ControlLabel>Name</ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    placeholder="eg: AK"
                    onChange={this.handleInputChange.bind(this, 'first')}
                  />
                </FormGroup>
                <FormGroup controlId="formInlineName">
                  <FormControl
                    type="text"
                    placeholder="J. Moriarty"
                    onChange={this.handleInputChange.bind(this, 'last')}
                  />
                </FormGroup>&nbsp;&nbsp;
                <FormGroup controlId="formInlineNameAbbr">
                  <ControlLabel>Name abbreviation</ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    placeholder="AK-JM"
                    onChange={this.handleInputChange.bind(this, 'abbr')}
                  />
                </FormGroup>&nbsp;&nbsp;
                <Button bsSize="xsmall" bsStyle="success" onClick={() => this.createGroup()}>
                  Create new group
                </Button>
              </Form>
            </Panel>
            <Panel header="My Groups" bsStyle="info">
              <Table responsive condensed hover>
                <thead>
                  <tr style={{ backgroundColor: '#ddd' }}>
                    <th width="20%">Name</th>
                    <th width="10%">Kürzel</th>
                    <th width="20%">Admin by</th>
                    <th width="50%">&nbsp;</th>
                  </tr>
                </thead>
                { tbody }
              </Table>
            </Panel>
          </div>
        </Modal.Body>
      </Modal>
    );
  }


  // render modal
  renderSubscribeModal() {
    if (this.state.showSubscription) {
      const tbody = this.state.currentSubscriptions.map(g => (
        <tr key={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
          <td width="10%" style={{ border: 'none' }}>
            <Button
              bsSize="xsmall"
              bsStyle={g.user_id == null ? 'success' : 'default'}
              onClick={() => this.subscribe(g)}
            >
              {g.user_id == null ? 'Subscribe' : 'Unsubscribe'}
            </Button>
          </td>
          <td width="90%" style={{ border: 'none' }}><div>{g.subject}</div></td>
        </tr>
      ));

      return (
        <Modal
          show={this.state.showSubscription}
          onHide={this.handleSubscriptionClose}
        >
          <Modal.Header closeButton>
            <Modal.Title>My Subscription</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            <div>
              <Table>
                <tbody>
                  { tbody }
                </tbody>
              </Table>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return (<div />);
  }

  render() {
    const templatesLink = (
      <MenuItem eventKey="2" href="ketcher/common_templates">Template Management</MenuItem>
    );

    return (
      <div>
        <Nav navbar pullRight>
          <NavDropdown title={`Logged in as ${this.state.currentUser.name}`} id="bg-nested-dropdown">
            <MenuItem eventKey="1" href="pages/settings" >Account Settings</MenuItem>
            {this.state.currentUser.is_templates_moderator ? templatesLink : null}
            <MenuItem eventKey="3" href="users/edit" >Change Password</MenuItem>
            <MenuItem eventKey="4" href="pages/profiles" >Change Profile</MenuItem>
            <MenuItem eventKey="5" href="pages/affiliations" >My Affiliations</MenuItem>
            <MenuItem onClick={this.handleShow}>My Groups</MenuItem>
            {/* <MenuItem onClick={this.handleSubscriptionShow}>My Subscriptions</MenuItem>
                Disable for now as there is no subsciption channel yet (Paggy) */}
            {/* <MenuItem eventKey="7" href="command_n_control" >My Devices</MenuItem> */}
          </NavDropdown>
          <NavItem onClick={() => this.logout()} style={{ marginRight: '5px' }} className="" title="Log out">
            <Glyphicon glyph="log-out" />
          </NavItem>
        </Nav>
        { this.renderModal() }
        { this.renderSubscribeModal() }
      </div>
    );
  }
}

UserAuth.propTypes = {
  currentUser: PropTypes.object,
  selectUsers: PropTypes.bool,
}
