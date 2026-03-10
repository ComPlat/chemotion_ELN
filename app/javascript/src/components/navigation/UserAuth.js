import React, { Component } from 'react';
import 'whatwg-fetch';
import {
  Card,
  Dropdown,
  Modal,
  Button,
  Table,
  Form,
  Col,
  Row,
} from 'react-bootstrap';
import _ from 'lodash';

import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { UserLabelModal } from 'src/components/UserLabels';
import GroupElement from 'src/components/navigation/GroupElement';
import { formatDate } from 'src/utilities/timezoneHelper';
import Affiliations from 'src/apps/userSettings/Affiliations';
import AccountProfile from 'src/apps/userSettings/AccountProfile';

export default class UserAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      showModal: false,
      showLabelModal: false,
      currentGroups: [],
      currentDevices: [],
      selectedUsers: null,
      showSubscription: false,
      showAffiliations: false,
      showSettings: false,
      currentSubscriptions: [],
      showDeviceMetadataModal: false,
      device: {},
      deviceMetadata: {
        dates: [],
      },
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
    this.handleAffiliationsShow = this.handleAffiliationsShow.bind(this);
    this.handleAffiliationsHide = this.handleAffiliationsHide.bind(this);
    this.renderAffiliations = this.renderAffiliations.bind(this);
    this.handleSettingsShow = this.handleSettingsShow.bind(this);
    this.handleSettingsHide = this.handleSettingsHide.bind(this);
    this.renderSettings = this.renderSettings.bind(this);

    this.promptTextCreator = this.promptTextCreator.bind(this);

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
      currentUser: state.currentUser,
    });
  }

  logout() {
    UserActions.logout();
  }

  promptTextCreator(label) {
    return `Share with "${label}"`;
  }

  handlefetchDeviceMetadataByDeviceId(deviceID) {
    UsersFetcher.fetchDeviceMetadataByDeviceId(deviceID).then((result) => {
      if (result.device_metadata) {
        this.setState({
          deviceMetadata: result.device_metadata,
        });
      }
    });
  }

  // show modal
  handleShow() {
    UsersFetcher.fetchCurrentGroup().then((result) => {
      this.setState({
        currentGroups: result.currentGroups,
        showModal: true,
        selectedUsers: null,
      });
    });
    UsersFetcher.fetchCurrentDevices().then((result) => {
      this.setState({
        currentDevices: result.currentDevices,
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
      device,
    });
    this.handlefetchDeviceMetadataByDeviceId(device.id);
  }

  handleDeviceMetadataModalClose() {
    this.setState({
      showDeviceMetadataModal: false,
      device: {},
      deviceMetadata: {},
    });
  }

  handleLabelShow() {
    this.setState({
      showLabelModal: true,
    });
  }

  handleLabelClose() {
    this.setState({ showLabelModal: false });
  }

  // show modal Subscription
  handleSubscriptionShow() {
    MessagesFetcher.fetchChannelWithUser().then((result) => {
      this.setState({
        showSubscription: true,
        currentSubscriptions: result.channels,
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

    MessagesFetcher.subscribeChannel({
      channel_id: node.id,
      subscribe: node.user_id == null,
    }).then((result) => {
      if (result.error) {
        // alert(result.error);
        NotificationActions.add({
          message: result.error,
          level: 'error',
        });
      } else {
        const actSubscription = _.filter(
          this.state.currentSubscriptions,
          (o) => o.id === result.channel_id
        );
        if (node.user_id != null) {
          actSubscription[0].user_id = null;
        } else {
          actSubscription[0].user_id = result.user_id;
        }
        const idx = _.findIndex(
          this.state.currentSubscriptions,
          (o) => o.id === result.channel_id
        );
        currentSubscriptions.splice(idx, 1, actSubscription[0]);
        this.setState({ currentSubscriptions });
      }
    });
  }

  // create new group
  // need to use the wording 'group_param' because of the definition of current api
  createGroup() {
    const {
      groupFirstName,
      groupLastName,
      groupAbbreviation,
      currentUser,
      currentGroups,
    } = this.state;
    const group_param = {
      first_name: groupFirstName,
      last_name: groupLastName,
      name_abbreviation: groupAbbreviation,
      users: [currentUser.id],
    };

    UsersFetcher.createGroup({ group_param }).then((result) => {
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

  handleChange(currentGroups) {
    this.setState({ currentGroups });
  }

  handleDeleteGroup = (currentGroupId) => {
    const currentGroups = this.state.currentGroups.filter(
      (cg) => cg.id !== currentGroupId
    );
    UsersFetcher.updateGroup({ id: currentGroupId, destroy_group: true });
    this.setState({ currentGroups });
  };

  handleDeleteUser = (groupRec, userRec) => {
    let { currentGroups, currentUser } = this.state;
    UsersFetcher.updateGroup({
      id: groupRec.id,
      destroy_group: false,
      rm_users: [userRec.id],
    }).then((result) => {
      const findIdx = _.findIndex(
        result.group.users,
        (o) => o.id == currentUser.id
      );
      const findAdmin = _.findIndex(
        result.group.admins,
        (o) => o.id == currentUser.id
      );
      if (findIdx == -1 && findAdmin == -1) {
        currentGroups = _.filter(
          this.state.currentGroups,
          (o) => o.id != result.group.id
        );
      } else {
        const idx = _.findIndex(currentGroups, (o) => o.id == result.group.id);
        currentGroups.splice(idx, 1, result.group);
      }
      this.setState({ currentGroups });
    });
  };

  handleAffiliationsShow() {
    this.setState({ showAffiliations: true });
  }

  handleAffiliationsHide = () => {
    this.setState({ showAffiliations: false });
  };

  // eslint-disable-next-line class-methods-use-this
  handleSettingsShow() {
    this.setState({ showSettings: true });
  }

  handleSettingsHide = () => {
    UserActions.fetchCurrentUser();
    this.setState({ showSettings: false });
  };

  renderAffiliations() {
    const { showAffiliations } = this.state;
    if (!showAffiliations) return null;

    return (
      <Affiliations
        show={showAffiliations}
        onHide={this.handleAffiliationsHide}
      />
    );
  }

  renderSettings() {
    const { showSettings, currentUser } = this.state;

    return (
      <Modal
        fullscreen
        show={showSettings}
        onHide={this.handleSettingsHide}
        centered
      >
        <Modal.Header closeButton />
        <Modal.Body style={{ padding: 0 }}>
          <AccountProfile currentUser={currentUser} />
        </Modal.Body>
      </Modal>
    );
  }

  // render modal
  renderModal() {
    const {
      showModal, currentUser, currentGroups, currentDevices
    } = this.state;

    const tBodyGroups = currentGroups.map((g) => (
      <GroupElement
        groupElement={g}
        key={g.id}
        currentUser={currentUser}
        currentGroup={currentGroups}
        onDeleteGroup={this.handleDeleteGroup}
        onDeleteUser={this.handleDeleteUser}
        onChangeData={this.handleChange}
      />
    ));

    const tBodyDevices = currentDevices.map((g) => (
      <tbody key={`tbody_${g.id}`}>
        <tr
          key={`row_${g.id}`}
          id={`row_${g.id}`}
          className="fw-bold"
        >
          <td>{g.name}</td>
          <td>{g.name_abbreviation}</td>
          <td>
            <Button
              size="sm"
              type="button"
              variant="info"
              onClick={() => this.handleDeviceMetadataModalShow(g)}
            >
              <i className="fa fa-laptop" />
            </Button>
          </td>
        </tr>
      </tbody>
    ));

    return (
      <Modal
        centered
        show={showModal}
        size="xl"
        onHide={this.handleClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>My Groups & Devices</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3">
          <Card border="success">
            <Card.Header>
              Create new group
            </Card.Header>
            <Card.Body>
              <Form>
                <Row className="align-items-end">
                  <Form.Group as={Col} controlId="formInlineFname">
                    <Form.Label>Name:</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="eg: AK"
                      onChange={this.handleInputChange.bind(this, 'first')}
                    />
                  </Form.Group>
                  <Form.Group as={Col} controlId="formInlineLname">
                    <Form.Control
                      type="text"
                      placeholder="J. Moriarty"
                      onChange={this.handleInputChange.bind(this, 'last')}
                    />
                  </Form.Group>
                  <Form.Group as={Col} controlId="formInlineNameAbbr">
                    <Form.Label>Name abbreviation:</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="AK-JM"
                      onChange={this.handleInputChange.bind(this, 'abbr')}
                    />
                  </Form.Group>
                  <Col>
                    <Button
                      variant="success"
                      onClick={() => this.createGroup()}
                    >
                      Create new group
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          <Card border="info">
            <Card.Header>
              My Groups
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th width="20%">Name</th>
                    <th width="10%">Abbreviation</th>
                    <th width="20%">Admin by</th>
                    <th width="50%">&nbsp;</th>
                  </tr>
                </thead>
                {tBodyGroups}
              </Table>
            </Card.Body>
          </Card>

          <Card border="info">
            <Card.Header>
              My Devices
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th width="40%">Name</th>
                    <th width="10%">Abbreviation</th>
                    <th width="50%">&nbsp;</th>
                  </tr>
                </thead>
                {tBodyDevices}
              </Table>
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>
    );
  }

  // render modal
  renderSubscribeModal() {
    const tbody = this.state.currentSubscriptions.map((g) => (
      <tr key={`row_${g.id}`} className="fw-bold">
        <td width="10%" style={{ border: 'none' }}>
          <Button
            size="sm"
            variant={g.user_id == null ? 'success' : 'light'}
            onClick={() => this.subscribe(g)}
          >
            {g.user_id == null ? 'Subscribe' : 'Unsubscribe'}
          </Button>
        </td>
        <td width="90%" style={{ border: 'none' }}>
          <div>{g.subject}</div>
        </td>
      </tr>
    ));

    return (
      <Modal
        centered
        show={this.state.showSubscription}
        onHide={this.handleSubscriptionClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>My Subscription</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div>
            <Table>
              <tbody>{tbody}</tbody>
            </Table>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderDeviceMetadataModal() {
    const { showDeviceMetadataModal, device, deviceMetadata } = this.state;
    const title = 'Device Metadata';
    return (
      <Modal
        centered
        show={showDeviceMetadataModal}
        onHide={this.handleDeviceMetadataModalClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {device.name}
            {' '}
            Metadata
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card border="success">
            <Card.Header>
              {title}
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group controlId="metadataFormDOI">
                  <Form.Label>DOI</Form.Label>
                  <Form.Control
                    type="text"
                    defaultValue={deviceMetadata.doi}
                    readonly="true"
                  />
                </Form.Group>
                <Form.Group controlId="metadataFormState">
                  <Form.Label>State</Form.Label>
                  <Form.Control
                    type="text"
                    defaultValue={deviceMetadata.data_cite_state}
                    readonly="true"
                  />
                </Form.Group>

                <Form.Group controlId="metadataFormURL">
                  <Form.Label>URL</Form.Label>
                  <Form.Control
                    type="text"
                    defaultValue={deviceMetadata.url}
                    readonly="true"
                  />
                </Form.Group>

                <Form.Group controlId="metadataFormLandingPage">
                  <Form.Label>Landing Page</Form.Label>
                  <Form.Control
                    type="text"
                    defaultValue={deviceMetadata.landing_page}
                    readonly="true"
                  />
                </Form.Group>
                <Form.Group controlId="metadataFormName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    defaultValue={deviceMetadata.name}
                    readonly="true"
                  />
                </Form.Group>
                <Form.Group controlId="metadataFormPublicationYear">
                  <Form.Label>Publication Year</Form.Label>
                  <Form.Control
                    type="number"
                    defaultValue={deviceMetadata.publication_year}
                    readonly="true"
                  />
                </Form.Group>
                <Form.Group controlId="metadataFormDescription">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    type="text"
                    defaultValue={deviceMetadata.description}
                    readonly="true"
                  />
                </Form.Group>

                {deviceMetadata.dates
                  && deviceMetadata.dates.map((dateItem, index) => (
                    <div key={index}>
                      <Col smOffset={0} sm={6}>
                        <Form.Group>
                          <Form.Label>Date</Form.Label>
                          <Form.Control
                            type="text"
                            defaultValue={dateItem.date}
                            readonly="true"
                          />
                        </Form.Group>
                      </Col>
                      <Col smOffset={0} sm={6}>
                        <Form.Group>
                          <Form.Label>DateType</Form.Label>
                          <Form.Control
                            type="text"
                            defaultValue={dateItem.dateType}
                            readonly="true"
                          />
                        </Form.Group>
                      </Col>
                    </div>
                  ))}

                <Row>
                  <Col smOffset={0} sm={12}>
                    <p className="text-right">
                      DataCiteVersion:
                      {' '}
                      {deviceMetadata.data_cite_version}
                      <br />
                      DataCiteUpdatedAt:
                      {' '}
                      {formatDate(deviceMetadata.data_cite_updated_at)}
                      <br />
                    </p>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const { currentUser, showLabelModal, showSubscription } = this.state;
    if (!currentUser) {
      return <i className="fa fa-spinner" />;
    }

    return (
      <>
        <Dropdown>
          <Dropdown.Toggle variant="topbar">
            <i className="fa fa-user me-1" />
            {currentUser.name}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              eventKey="1"
              onClick={this.handleSettingsShow}
            >
              Account &amp; Profile
            </Dropdown.Item>
            <Dropdown.Item eventKey="3" href="/users/edit">
              Change Password
            </Dropdown.Item>
            <Dropdown.Item
              onClick={this.handleAffiliationsShow}
            >
              My Affiliations
            </Dropdown.Item>
            <Dropdown.Item onClick={this.handleShow}>My Groups & Devices</Dropdown.Item>
            <Dropdown.Item onClick={this.handleLabelShow}>My Labels</Dropdown.Item>
            {/* <Dropdown.Item onClick={this.handleSubscriptionShow}>My Subscriptions</Dropdown.Item>
                  Disable for now as there is no subsciption channel yet (Paggy) */}
            <Dropdown.Item eventKey="7" href="/command_n_control">
              My Devices
            </Dropdown.Item>
            {currentUser.molecule_editor && (
              <Dropdown.Item eventKey="6" href="/molecule_moderator">
                Molecule Moderator
              </Dropdown.Item>
            )}
            <Dropdown.Item eventKey="12" href="/converter_admin">
              Converter Profile
            </Dropdown.Item>
            <Dropdown.Item eventKey="8" href="/generic_elements_admin">Generic Designer</Dropdown.Item>

            <Dropdown.Item onClick={() => UserActions.logout()}>
              <i className="fa fa-sign-out me-1" />
              Log out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        {this.renderModal()}
        {this.renderAffiliations()}
        {this.renderSettings()}
        <UserLabelModal
          showLabelModal={showLabelModal}
          onHide={() => this.handleLabelClose()}
        />
        {showSubscription && this.renderSubscribeModal()}
        {this.renderDeviceMetadataModal()}
      </>
    );
  }
}
