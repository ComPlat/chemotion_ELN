import React from 'react';
import PropTypes from 'prop-types';
import {
  Table, Button, Form, Card,
} from 'react-bootstrap';
import { findIndex } from 'lodash';
import { injectIntl, FormattedMessage } from 'react-intl';
import AppModal from 'src/components/common/AppModal';
import { AsyncSelect } from 'src/components/common/Select';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import AdminDeviceFetcher from 'src/fetchers/AdminDeviceFetcher';
import { selectUserOptionFormater, selectDeviceOptionFormater } from 'src/utilities/selectHelper';
import AdminGroupElement from 'src/apps/admin/AdminGroupElement';

class GroupsDevices extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      showModal: false,
      showCreateModal: false,
      rootType: '', // Group
      actionType: 'Person', // Person Group Device Adm
      root: {},
    };
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.loadUserByNameType = this.loadUserByNameType.bind(this);
    this.handleShowModal = this.handleShowModal.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleShowCreateModal = this.handleShowCreateModal.bind(this);
    this.handleCloseGroup = this.handleCloseGroup.bind(this);
    this.handleGroupChange = this.handleGroupChange.bind(this);
  }

  componentDidMount() {
    this.fetch('Group');
  }

  handleGroupChange() {
    this.fetch('Group');
  }

  handleShowModal(root, rootType, actionType) {
    this.setState({
      showModal: true,
      actionType,
      rootType,
      root
    });
  }

  handleClose() {
    this.setState({
      showModal: false,
      rootType: '',
      actionType: '',
      root: null
    });
  }

  handleShowCreateModal(rootType) {
    this.setState({
      showCreateModal: true,
      rootType
    });
  }

  handleCloseGroup() {
    this.setState({ showCreateModal: false });
  }

  handleSelectUser(val) {
    this.setState({ selectedUsers: val });
  }

  fetch(type) {
    AdminFetcher.fetchGroupsDevices(type)
      .then((result) => {
        switch (type) {
          case 'Group':
            this.setState({ groups: result.list });
            break;
          case 'Device':
            this.setState({ devices: result.list });
            break;
          default:
            break;
        }
      });
  }

  fetchDevices() {
    AdminDeviceFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices
        });
      });
  }

  loadUserByNameType(input) {
    const { actionType } = this.state;
    if (!input) {
      return Promise.resolve([]);
    }

    if (actionType === 'Device') {
      return AdminDeviceFetcher.fetchDevicesByName(input)
        .then((res) => selectDeviceOptionFormater({ data: res, withType: false }))
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }
    return AdminFetcher.fetchUsersByNameType(input, actionType)
      .then((res) => selectUserOptionFormater({ data: res, withType: false }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createGroup() {
    const { groups, devices, rootType } = this.state;
    const param = {
      rootType,
      first_name: this.firstInput.value.trim(),
      last_name: this.lastInput.value.trim(),
      name_abbreviation: this.abbrInput.value.trim()
    };

    if (this.emailInput.value.trim().length > 0) {
      param.email = this.emailInput.value.trim();
    }

    AdminFetcher.createGroupDevice(param)
      .then((result) => {
        if (result.error) {
          // eslint-disable-next-line no-alert
          alert(result.error);
        } else {
          switch (rootType) {
            case 'Group':
              groups.push(result);
              this.setState({
                groups,
                showCreateModal: false
              });
              break;
            case 'Device':
              devices.push(result);
              this.setState({
                devices,
                showCreateModal: false
              });
              break;
            default:
              break;
          }
        }
      });
  }

  addToRoot(groupRec) {
    const {
      selectedUsers,
      groups,
      devices,
      rootType,
      actionType
    } = this.state;

    const userIds = (selectedUsers ?? []).map((g) => g.value);

    const params = {
      action: 'NodeAdd',
      rootType,
      actionType,
      id: groupRec.id,
      add_users: userIds
    };
    let idx = -1;

    AdminFetcher.updateGroup(params)
      .then((result) => {
        switch (rootType) {
          case 'Group':
            idx = findIndex(groups, (o) => o.id === result.root.id);
            groups.splice(idx, 1, result.root);
            this.fetchDevices();
            break;
          case 'Device':
            idx = findIndex(devices, (o) => o.id === result.root.id);
            devices.splice(idx, 1, result.root);
            this.fetch('Group');
            break;
          default:
            break;
        }
        this.setState({ selectedUsers: null, showModal: false });
      });
  }

  renderGroups() {
    const { groups } = this.state;
    let tbody = null;
    if (Object.keys(groups).length <= 0) {
      tbody = null;
    } else {
      tbody = groups.map((g, idx) => (
        <AdminGroupElement
          groupElement={g}
          index={idx}
          currentState={this.state}
          onChangeGroupData={this.handleGroupChange}
          onShowModal={this.handleShowModal}
          key={`group-element-key-component-${g.id}`}
        />
      ));
    }

    return (
      <Card>
        <Card.Header>
          <Card.Title className="mt-1 py-1">
            <FormattedMessage
              id="groups-list_title"
              values={{ count: groups.length }}
            />
            <Button
              variant="primary"
              className="ms-2"
              size="md"
              onClick={() => this.handleShowCreateModal('Group')}
            >
              <FormattedMessage id="groups-add_new_group" />
            </Button>
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <Table responsive condensed hover>
            <thead>
              <tr className="bg-gray-200 ">
                <th className="py-3">#</th>
                <th className="w-25 py-3"><FormattedMessage id="actions" /></th>
                <th className="py-3"><FormattedMessage id="name" /></th>
                <th className="py-3"><FormattedMessage id="user_management-abbr" /></th>
                <th className="py-3"><FormattedMessage id="groups-admin_by" /></th>
                <th className="py-3"><FormattedMessage id="email" /></th>
              </tr>
            </thead>
            {tbody}
          </Table>
        </Card.Body>
      </Card>
    );
  }

  renderCreateModal() {
    const { showCreateModal, rootType } = this.state;
    const { intl } = this.props;
    const title = rootType === 'Group'
      ? intl.formatMessage({ id: 'groups-add_new_group' })
      : intl.formatMessage({ id: 'devices-add' });
    const primaryActionLabel = rootType === 'Group'
      ? intl.formatMessage({ id: 'groups-create_new_group' })
      : intl.formatMessage({ id: 'groups-create_new_device' });
    return (
      <AppModal
        show={showCreateModal}
        onHide={this.handleCloseGroup}
        title={title}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={() => this.createGroup()}
        closeLabel={intl.formatMessage({ id: 'cancel' })}
      >
        <Form>
          <Form.Group controlId="formInlineName" className="mb-3 fs-5 fw-bold">
            <Form.Label>
              <FormattedMessage id="name" />
              *
            </Form.Label>
            <Form.Control
              type="text"
              ref={(m) => { this.firstInput = m; }}
              placeholder="eg: AK"
              className="py-2"
            />
          </Form.Group>
          <Form.Group controlId="formInlineName" className="mb-3 fs-5 fw-bold">
            <Form.Control
              type="text"
              ref={(m) => { this.lastInput = m; }}
              placeholder="J. Moriarty"
              className="py-2"
            />
          </Form.Group>
          <Form.Group controlId="formInlineNameAbbr" className="mb-3 fs-5 fw-bold">
            <Form.Label>
              <FormattedMessage id="devices-name_abbreviation" />
              *
            </Form.Label>
            <Form.Control
              type="text"
              ref={(m) => { this.abbrInput = m; }}
              placeholder="AK-JM"
              className="py-2"
            />
          </Form.Group>
          <Form.Group controlId="formInlineEmail" className="mb-4 fs-5 fw-bold">
            <Form.Label><FormattedMessage id="email" /></Form.Label>
            <Form.Control
              type="text"
              ref={(m) => { this.emailInput = m; }}
              placeholder="eg: abc@kit.edu"
              className="py-2"
            />
          </Form.Group>
        </Form>
      </AppModal>
    );
  }

  renderModal() {
    const {
      showModal,
      root,
      rootType,
      actionType,
      selectedUsers
    } = this.state;
    const { intl } = this.props;
    let titleId = '';
    switch (rootType) {
      case 'Group':
        titleId = actionType === 'Person'
          ? 'groups-add_users_to_group'
          : 'groups-add_devices_to_group';
        break;
      case 'Device':
        titleId = actionType === 'Person'
          ? 'groups-add_permission_to_users'
          : 'groups-add_permission_to_groups';
        break;
      default:
        break;
    }
    const title = titleId
      ? intl.formatMessage({ id: titleId }, { name: root?.name ?? '' })
      : '';

    return (
      <AppModal
        show={showModal}
        onHide={this.handleClose}
        title={title}
        primaryActionLabel={intl.formatMessage({ id: 'add' })}
        onPrimaryAction={() => this.addToRoot(root)}
        closeLabel={intl.formatMessage({ id: 'cancel' })}
      >
        <AsyncSelect
          isMulti
          value={selectedUsers}
          matchProp="name"
          placeholder={intl.formatMessage({ id: 'select_placeholder' })}
          loadOptions={this.loadUserByNameType}
          onChange={this.handleSelectUser}
        />
      </AppModal>
    );
  }

  render() {
    return (
      <div className="list-container-bottom">
        {this.renderGroups()}
        {this.renderModal()}
        {this.renderCreateModal()}
      </div>
    );
  }
}

GroupsDevices.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(GroupsDevices);
