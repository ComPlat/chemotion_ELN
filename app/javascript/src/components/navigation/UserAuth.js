import React, { useContext, useEffect, useState } from 'react';
import 'whatwg-fetch';
import propType from 'prop-types';
import {
  Card,
  Dropdown,
  Button,
  Table,
  Form,
  Col,
  Row,
} from 'react-bootstrap';
import _ from 'lodash';
import { observer } from 'mobx';
import AppModal from 'src/components/common/AppModal';

import UsersFetcher from 'src/fetchers/UsersFetcher';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { UserLabelModal } from 'src/components/UserLabels';
import GroupElement from 'src/components/navigation/GroupElement';
import { formatDate } from 'src/utilities/timezoneHelper';
import AccountProfile from 'src/apps/userSettings/AccountProfile';

const UserAuth = ({ userMenuDropdownToggleVariant }) => {
  const [showModal, setShowModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [currentGroups, setCurrentGroups] = useState([]);
  const [currentDevices, setCurrentDevices] = useState([]);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentSubscriptions, setCurrentSubscriptions] = useState([]);
  const [showDeviceMetadataModal, setShowDeviceMetadataModal] = useState(false);
  const [device, setDevice] = useState({});
  const [deviceMetadata, setDeviceMetadata] = useState({});
  const [groupFirstName, setGroupFirstName] = useState('');
  const [groupLastName, setGroupLastName] = useState('');
  const [groupAbbreviation, setGroupAbbreviation] = useState('');

  const { userStore, notifications } = useContext(StoreContext);

  useEffect(() => {
    if (!userStore.currentUser) { userStore.fetchCurrentUser(); }
    const showSettingsFunction = () => setShowSettings(true);
    window.addEventListener('chemotion:open-settings', showSettingsFunction);

    const onUnmount = () => {
      window.removeEventListener('chemotion:open-settings', showSettingsFunction);
    };
    return onUnmount;
  }, []);

  const fetchDeviceMetadata = (deviceID) => {
    UsersFetcher.fetchDeviceMetadataByDeviceId(deviceID).then((result) => {
      if (result.device_metadata) {
        setDeviceMetadata(result.device_metadata);
      }
    });
  };

  // show modal
  const handleShow = () => {
    UsersFetcher.fetchCurrentGroup().then((result) => {
      setCurrentGroups(result.currentGroups);
      setShowModal(true);
    });
    UsersFetcher.fetchCurrentDevices().then((result) => {
      setCurrentDevices(result.currentDevices);
    });
  };

  const handleDeviceMetadataModalShow = (currentDevice) => {
    setShowDeviceMetadataModal(true);
    setDevice(currentDevice);
    fetchDeviceMetadata(currentDevice.id);
  };

  const handleDeviceMetadataModalClose = () => {
    setShowDeviceMetadataModal(false);
    setDevice({});
    setDeviceMetadata({});
  };

  // show modal Subscription
  // const handleSubscriptionShow = () => {
  //   MessagesFetcher.fetchChannelWithUser().then((result) => {
  //     setShowSubscription(true);
  //     setCurrentSubscriptions(result.channels)
  //   });
  // };

  const subscribe = (node) => {
    MessagesFetcher.subscribeChannel({
      channel_id: node.id,
      subscribe: node.user_id == null,
    }).then((result) => {
      if (result.error) {
        // alert(result.error);
        notifications.add({
          message: result.error,
          level: 'error',
        });
      } else {
        const indexOfSubscriptionToUpdate = currentSubscriptions.findIndex(
          (subscription) => subscription.id === result.channel_id
        );

        currentSubscriptions[indexOfSubscriptionToUpdate].user_id =
          node.user_id != null
          ? null
          : result.user_id;

        setCurrentSubscriptions(currentSubscriptions);
      }
    });
  };

  // create new group
  // need to use the wording 'group_param' because of the definition of current api
  const createGroup = () => {
    const groupParams = {
      first_name: groupFirstName,
      last_name: groupLastName,
      name_abbreviation: groupAbbreviation,
      users: [userStore.currentUser.id],
    };

    UsersFetcher.createGroup(groupParams).then((result) => {
      if (result.error) {
        alert(result.error);
      } else {
        setCurrentGroups(currentGroups.concat([result.group]));
      }
    });
  };

  const handleDeleteGroup = (currentGroupId) => {
    const groupsWithoutDeletionTarget = currentGroups.filter((cg) => cg.id !== currentGroupId);
    UsersFetcher.destroyGroup(currentGroupId);
    setCurrentGroups(groupsWithoutDeletionTarget);
  };

  const handleDeleteUser = (group, user) => {
    UsersFetcher.removeMember(groupRec.id, userRec.id).then((result) => {
      const userIndex = result?.group?.users?.findIndex(
        (group_user) => group_user.id === userStore.currentUser.id
      ) || -1;

      const adminIndex = result?.group?.admins?.findIndex(
        (group_admin) => group_admin.id === userStore.currentUser.id
      ) || -1;

      if (userIndex === -1 && adminIndex === -1) {
        const groupsWithoutUpdatedGroup = currentGroups.filter((current_group) => current_group.id !== result.group.id);
        setCurrentGroups(groupsWithoutUpdatedGroup);
      } else {
        const indexOfUpdatedGroup = currentGroups.findIndex((current_group) => current_group.id === result.group.id);
        currentGroups.splice(indexOfUpdatedGroup, 1, result.group);
        setCurrentGroups(currentGroups);
      }
    });
  };

  const handleSettingsHide = () => {
    userStore.fetchCurrentUser();
    setShowSettings(false);
  };

  const renderSettings = () => {
    if (!showSettings) return;

    return (
      <div style={{
        zIndex: 15,
        background: 'white',
        position: 'fixed',
        left: 0,
        width: '100vw',
        top: 0,
        bottom: 0,
        margin: 0,
        height: 'auto',
        overflow: 'auto',
      }}
      >
        <AccountProfile currentUser={userStore.currentUser} closeSettings={handleSettingsHide} />
      </div>
    );
  };

  // render modal
  const renderModal = () => {
    const tBodyGroups = currentGroups.map((g) => (
      <GroupElement
        groupElement={g}
        key={g.id}
        currentUser={userStore.currentUser}
        currentGroup={currentGroups}
        onDeleteGroup={handleDeleteGroup}
        onDeleteUser={handleDeleteUser}
        onChangeData={(updatedCurrentGroups => setCurrentGroups(updatedCurrentGroups))}
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
              onClick={() => handleDeviceMetadataModalShow(g)}
            >
              <i className="fa fa-laptop" />
            </Button>
          </td>
        </tr>
      </tbody>
    ));

    return (
      <AppModal
        title="My Groups & Devices"
        show={showModal}
        size="xl"
        onHide={() => setShowModal(false) }
        closeLabel="Close"
        showFooter
      >
        <div className="d-flex flex-column gap-3">
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
                      onChange={(event) => { setGroupFirstName(event.currentTarget.value); }}
                    />
                  </Form.Group>
                  <Form.Group as={Col} controlId="formInlineLname">
                    <Form.Control
                      type="text"
                      placeholder="J. Moriarty"
                      onChange={(event) => { setGroupLastName(event.currentTarget.value); }}
                    />
                  </Form.Group>
                  <Form.Group as={Col} controlId="formInlineNameAbbr">
                    <Form.Label>Name abbreviation:</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="AK-JM"
                      onChange={(event) => { setGroupAbbreviation(event.currentTarget.value); }}
                    />
                  </Form.Group>
                  <Col>
                    <Button
                      variant="success"
                      onClick={createGroup}
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
        </div>
      </AppModal>
    );
  };

  // render modal
  const renderSubscribeModal = () => {
    const tbody = currentSubscriptions.map((g) => (
      <tr key={`row_${g.id}`} className="fw-bold">
        <td width="10%" style={{ border: 'none' }}>
          <Button
            size="sm"
            variant={g.user_id == null ? 'success' : 'light'}
            onClick={() => subscribe(g)}
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
      <AppModal
        title="My Subscription"
        show={showSubscription}
        onHide={() => setShowSubscription(false)}
        closeLabel="Close"
        showFooter
      >
        <Table>
          <tbody>{tbody}</tbody>
        </Table>
      </AppModal>
    );
  };

  const renderDeviceMetadataModal = () => {
    const title = 'Device Metadata';
    return (
      <AppModal
        title={(
          <>
            {device.name}
            {' '}
            Metadata
          </>
        )}
        show={showDeviceMetadataModal}
        onHide={handleDeviceMetadataModalClose}
        closeLabel="Close"
        showFooter
      >
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
      </AppModal>
    );
  };

  if (!userStore.currentUser) return <i className="fa fa-spinner" />;

  return (
    <>
      <Dropdown>
        <Dropdown.Toggle variant={userMenuDropdownToggleVariant}>
          <i className="fa fa-user me-1" />
          {userStore.currentUser.name}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            eventKey="1"
            onClick={this.handleSettingsShow}
          >
            Settings
          </Dropdown.Item>
          <Dropdown.Item onClick={handleShow}>My Groups & Devices</Dropdown.Item>
          <Dropdown.Item onClick={() => setShowLabelModal(true)}>My Labels</Dropdown.Item>
          {/* <Dropdown.Item onClick={handleSubscriptionShow}>My Subscriptions</Dropdown.Item>
                Disable for now as there is no subsciption channel yet (Paggy) */}
          <Dropdown.Item eventKey="7" href="/command_n_control">
            My Devices
          </Dropdown.Item>
          {userStore.currentUser.molecule_editor && (
            <Dropdown.Item eventKey="6" href="/molecule_moderator">
              Molecule Moderator
            </Dropdown.Item>
          )}
          <Dropdown.Item eventKey="12" href="/converter_admin">
            Converter Profile
          </Dropdown.Item>
          <Dropdown.Item eventKey="8" href="/generic_elements_admin">Generic Designer</Dropdown.Item>

          <Dropdown.Item onClick={() =>  { userStore.logout(); StoreContext.reset(); }}>
            <i className="fa fa-sign-out me-1" />
            Log out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      {renderModal()}
      {renderSettings()}
      <UserLabelModal
        showLabelModal={showLabelModal}
        onHide={() => setShowLabelModal(false)}
      />
      {showSubscription && renderSubscribeModal()}
      {renderDeviceMetadataModal()}
    </>
  );
};

UserAuth.propTypes = {
  userMenuDropdownToggleVariant: propType.string,
};

UserAuth.defaultProps = {
  userMenuDropdownToggleVariant: 'topbar',
};

export default observer(UserAuth);
