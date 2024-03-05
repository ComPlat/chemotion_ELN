import React, { Component } from 'react';
import PropTypes from 'prop-types'
import 'whatwg-fetch';
import { ButtonGroup, OverlayTrigger, Popover, Nav, NavDropdown, NavItem, MenuItem, Glyphicon, Modal, Button, Table, Panel, Form, FormControl, FormGroup, ControlLabel, Col, Row } from 'react-bootstrap';
import moment from 'moment';
import Select from 'react-select';
import _ from 'lodash';

import UserActions from './actions/UserActions';
import UserStore from './stores/UserStore';
import Functions from './utils/Functions';
import UsersFetcher from './fetchers/UsersFetcher';
import MessagesFetcher from './fetchers/MessagesFetcher';
import NotificationActions from '../components/actions/NotificationActions';
import { UserLabelModal } from '../components/UserLabels';
import MatrixCheck from '../components/common/MatrixCheck';
import GroupElement from './GroupElement';

export default class UserAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentUser || { name: 'unknown' },
      showModal: false,
      showLabelModal: false,
      currentGroups: [],
      currentDevices: [],
      selectedUsers: null,
      showSubscription: false,
      currentSubscriptions: [],
      showDeviceMetadataModal: false,
      device: {},
      deviceMetadata: {
        dates: []
      }
    };

    this.onChange = this.onChange.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleLabelShow = this.handleLabelShow.bind(this);
    this.handleLabelClose = this.handleLabelClose.bind(this);
    this.handleSubscriptionShow = this.handleSubscriptionShow.bind(this);
    this.handleSubscriptionClose = this.handleSubscriptionClose.bind(this);
    this.handleDeviceMetadataModalShow = this.handleDeviceMetadataModalShow.bind(this);
    this.handleDeviceMetadataModalClose = this.handleDeviceMetadataModalClose.bind(this);

    this.promptTextCreator = this.promptTextCreator.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
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

  handlefetchDeviceMetadataByDeviceId(deviceID) {
    UsersFetcher.fetchDeviceMetadataByDeviceId(deviceID)
      .then((result) => {
        if (result.device_metadata) {
          this.setState({
            deviceMetadata: result.device_metadata
          });
        }
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
    UsersFetcher.fetchCurrentDevices()
      .then((result) => {
        this.setState({
          currentDevices: result.currentDevices
        });
      });
  }

  // hide modal
  handleClose() {
    this.setState({ showModal: false, selectedUsers: null });
  }

  handleDeviceMetadataModalShow(device) {
    this.setState({
      showDeviceMetadataModal: true,
      device
    });
    this.handlefetchDeviceMetadataByDeviceId(device.id);
  }

  handleDeviceMetadataModalClose() {
    this.setState({
      showDeviceMetadataModal: false,
      device: {},
      deviceMetadata: {}
    });
  }

  handleLabelShow() {
    this.setState({
      showLabelModal: true
    });
  }

  handleLabelClose() {
    this.setState({ showLabelModal: false });
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

  renderDeviceButtons(device) {
    return (
      <td>
        <Button bsSize="xsmall" type="button" bsStyle="info" className="fa fa-laptop" onClick={() => this.handleDeviceMetadataModalShow(device)} />&nbsp;&nbsp;
      </td>
    );
  }

  handleChange(currentGroups) {
    this.setState({ currentGroups: currentGroups });
  }

  // render modal
  renderModal() {
    const { showModal, currentGroups, currentDevices } = this.state;

    const modalStyle = {
      overflowY: 'auto',
    };

    let tBodyGroups = '';
    let tBodyDevices = '';

    if (Object.keys(currentGroups).length <= 0) {
      tBodyGroups = '';
    } else {
      tBodyGroups = currentGroups ? currentGroups.map(g => (
        <GroupElement groupElement={g} currentState={this.state} onChangeData={this.handleChange}></GroupElement>
      )) : '';
    }

    if (Object.keys(currentDevices).length <= 0) {
      tBodyDevices = '';
    } else {
      tBodyDevices = currentDevices ? currentDevices.map(g => (
        <tbody key={`tbody_${g.id}`}>
          <tr key={`row_${g.id}`} id={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
            <td>{g.name}</td>
            <td>{g.name_abbreviation}</td>
            {this.renderDeviceButtons(g)}
          </tr>
        </tbody>
      )) : '';
    }

    return (
      <Modal
        show={showModal}
        dialogClassName="importChemDrawModal"
        onHide={this.handleClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>My Groups & Devices</Modal.Title>
        </Modal.Header>
        <Modal.Body style={modalStyle}>
          <div>
            <Panel bsStyle="success">
              <Panel.Heading>
                <Panel.Title>
                  Create new group
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
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
              </Panel.Body>
            </Panel>
            <Panel bsStyle="info">
              <Panel.Heading>
                <Panel.Title>
                  My Groups
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <Table responsive condensed hover>
                  <thead>
                    <tr style={{ backgroundColor: '#ddd' }}>
                      <th width="20%">Name</th>
                      <th width="10%">Kürzel</th>
                      <th width="20%">Admin by</th>
                      <th width="50%">&nbsp;</th>
                    </tr>
                  </thead>
                  {tBodyGroups}
                </Table>
              </Panel.Body>
            </Panel>
            <Panel bsStyle="info">
              <Panel.Heading>
                <Panel.Title>
                  My Devices
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <Table responsive condensed hover>
                  <thead>
                    <tr style={{ backgroundColor: '#ddd' }}>
                      <th width="40%">Name</th>
                      <th width="10%">Kürzel</th>
                      <th width="50%">&nbsp;</th>
                    </tr>
                  </thead>
                  {tBodyDevices}
                </Table>
              </Panel.Body>
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
                  {tbody}
                </tbody>
              </Table>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return (<div />);
  }

  renderDeviceMetadataModal() {
    const { showDeviceMetadataModal, device, deviceMetadata } = this.state;
    const title = 'Device Metadata';
    return (
      <Modal
        show={showDeviceMetadataModal}
        onHide={this.handleDeviceMetadataModalClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>{device.name} Metadata</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Panel bsStyle="success">
            <Panel.Heading>
              <Panel.Title>
                {title}
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              <Form>
                <FormGroup controlId="metadataFormDOI">
                  <ControlLabel>DOI</ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.doi}
                    readonly="true"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormState">
                  <ControlLabel>State</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.data_cite_state}
                    readonly="true"
                  />
                </FormGroup>

                <FormGroup controlId="metadataFormURL">
                  <ControlLabel>URL</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.url}
                    readonly="true"
                  />
                </FormGroup>

                <FormGroup controlId="metadataFormLandingPage">
                  <ControlLabel>Landing Page</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.landing_page}
                    readonly="true"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormName">
                  <ControlLabel>Name</ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.name}
                    readonly="true"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormPublicationYear">
                  <ControlLabel>Publication Year</ControlLabel>
                  <FormControl
                    type="number"
                    defaultValue={deviceMetadata.publication_year}
                    readonly="true"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormDescription">
                  <ControlLabel>Description</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.description}
                    readonly="true"
                  />
                </FormGroup>

                {deviceMetadata.dates && deviceMetadata.dates.map((dateItem, index) => (
                  <div key={index}>
                    <Col smOffset={0} sm={6}>
                      <FormGroup>
                        <ControlLabel>Date</ControlLabel>
                        <FormControl
                          type="text"
                          defaultValue={dateItem.date}
                          readonly="true"
                        />
                      </FormGroup>
                    </Col>
                    <Col smOffset={0} sm={6}>
                      <FormGroup>
                        <ControlLabel>DateType</ControlLabel>
                        <FormControl
                          type="text"
                          defaultValue={dateItem.dateType}
                          readonly="true"
                        />
                      </FormGroup>
                    </Col>
                  </div>
                ))}

                <Row>
                  <Col smOffset={0} sm={12}>
                    <p class="text-right">
                      DataCiteVersion: {deviceMetadata.data_cite_version}<br />
                      DataCiteUpdatedAt: {moment(deviceMetadata.data_cite_updated_at).format('YYYY-MM-DD HH:mm')}<br />
                    </p>
                  </Col>
                </Row>
              </Form>
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const templatesLink = (
      <MenuItem eventKey="2" href="/ketcher/common_templates">Template Management</MenuItem>
    );
    const moderatorLink = (
      <MenuItem eventKey="6" href="/molecule_moderator">Molecule Moderator</MenuItem>
    );

    let userLabel = (<span />);
    if (MatrixCheck(this.state.currentUser.matrix, 'userLabel')) {
      userLabel = (<MenuItem onClick={this.handleLabelShow}>My Labels</MenuItem>);
    }

    return (
      <div>
        <Nav navbar pullRight>
          <NavDropdown title={`${this.state.currentUser.name}`} id="bg-nested-dropdown">
            <MenuItem eventKey="1" href="/pages/settings" >Account &amp; Profile</MenuItem>
            {this.state.currentUser.is_templates_moderator ? templatesLink : null}
            <MenuItem eventKey="3" href="/users/edit" >Change Password</MenuItem>
            <MenuItem eventKey="5" href="/pages/affiliations" >My Affiliations</MenuItem>
            <MenuItem onClick={this.handleShow}>My Groups & Devices</MenuItem>
            {userLabel}
            {/* <MenuItem onClick={this.handleSubscriptionShow}>My Subscriptions</MenuItem>
                Disable for now as there is no subsciption channel yet (Paggy) */}
            <MenuItem eventKey="7" href="/command_n_control" >My Devices</MenuItem>
            {this.state.currentUser.molecule_editor ? moderatorLink : null}
          </NavDropdown>
          <NavItem onClick={() => this.logout()} style={{ marginRight: '5px' }} className="" title="Log out">
            <Glyphicon glyph="log-out" />
          </NavItem>
        </Nav>
        {this.renderModal()}
        <UserLabelModal showLabelModal={this.state.showLabelModal} onHide={() => this.handleLabelClose()} />
        {this.renderSubscribeModal()}
        {this.renderDeviceMetadataModal()}
      </div>
    );
  }
}

UserAuth.propTypes = {
  currentUser: PropTypes.object,
  selectUsers: PropTypes.bool,
}
