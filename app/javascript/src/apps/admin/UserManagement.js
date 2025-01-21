/* eslint-disable react/destructuring-assignment */
import React from 'react';
import {
  Table, Button, Modal, Form, Tooltip, OverlayTrigger, Tabs, Tab,
  Nav, NavItem, Alert, Card, Col,
  Row
} from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';
import { CSVReader } from 'react-papaparse';
import propType from 'prop-types';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';
import GenericAdminModal from 'src/apps/admin/generic/GenericAdminModal';

function MessageAlert({ message, onHide }) {
  return (
    message?.length > 0 ? (
      <Alert variant="info" onDismiss={onHide} dismissible>
        <p>
          {message}
        </p>
      </Alert>
    ) : null
  );
}

MessageAlert.propTypes = {
  message: propType.string,
  onHide: propType.func.isRequired,
};
MessageAlert.defaultProps = {
  message: '',
};

const loadUserByName = (input) => {
  if (!input) {
    return Promise.resolve([]);
  }

  return AdminFetcher.fetchUsersByNameType(input, 'Person')
    .then((res) => selectUserOptionFormater({ data: res }))
    .catch((errorMessage) => {
      console.log(errorMessage);
    });
};

const handleResetPassword = (id, random, handleShowAlert) => {
  AdminFetcher.resetUserPassword({ user_id: id, random })
    .then((result) => {
      if (result.rp) {
        let message = '';
        if (random) {
          message = result.pwd ? `Password reset for user ${id}! New password: \n ${result.pwd}`
            : 'Password reset!';
        } else {
          message = result.email ? `Password reset! instructions sent to : \n ${result.email}`
            : 'Password instruction sent!';
        }
        handleShowAlert(message);
      } else {
        handleShowAlert(`Password reset fail: \n ${result.pwd}`);
      }
    });
};

const validateEmail = (mail) => (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,63})+$/.test(mail));
const editTooltip = <Tooltip id="inchi_tooltip">Edit user info</Tooltip>;
const resetPasswordTooltip = <Tooltip id="assign_button">Reset password</Tooltip>;
const resetPasswordInstructionsTooltip = <Tooltip id="assign_button">Send password instructions</Tooltip>;
const confirmUserTooltip = <Tooltip id="assign_button">Confirm this account</Tooltip>;
const confirmEmailChangeTooltip = (email) => (
  <Tooltip id="email_change_button">
    Confirm E-Mail:
    <br />
    {email}
  </Tooltip>
);
const disableTooltip = <Tooltip id="assign_button">Lock this account</Tooltip>;
const enableTooltip = <Tooltip id="assign_button">Unlock this account</Tooltip>;
const converterEnableTooltip = (
  <Tooltip id="assign_button">
    Enable Converter profiles editing for this user (currently disabled)
  </Tooltip>
);
const converterDisableTooltip = (
  <Tooltip id="assign_button">
    Disable Converter profiles editing for this user (currently enabled)
  </Tooltip>
);
const templateModeratorEnableTooltip = (
  <Tooltip id="assign_button">
    Enable Ketcher template editing for this user (currently disabled)
  </Tooltip>
);
const templateModeratorDisableTooltip = (
  <Tooltip id="assign_button">
    Disable Ketcher template editing for this user (currently enabled)
  </Tooltip>
);
const moleculeModeratorEnableTooltip = (
  <Tooltip id="assign_button">
    Enable editing the representation of the global molecules for this user (currently disabled)
  </Tooltip>
);
const moleculeModeratorDisableTooltip = (
  <Tooltip id="assign_button">
    Disable editing the representation of the global molecules for this user (currently enabled)
  </Tooltip>
);
const accountActiveTooltip = (
  <Tooltip id="assign_button">
    This user account is deactivated, click to [activate]
  </Tooltip>
);
const accountInActiveTooltip = (
  <Tooltip id="assign_button">
    This user account is activated, click to [deactivate]
  </Tooltip>
);

const renderDeletedUsersTable = (deletedUsers) => (
  <Table striped bordered hover className="mt-3">
    <thead>
      <tr>
        <th>ID</th>
        <th>Deleted at</th>
      </tr>
    </thead>
    <tbody>
      {deletedUsers.map((item) => (
        <tr key={item.id}>
          <td>{item.id}</td>
          <td>{item.deleted_at}</td>
        </tr>
      ))}
    </tbody>
  </Table>
);

export default class UserManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      user: {},
      deletedUsers: [],
      selectedUsers: null,
      showMsgModal: false,
      showNewUserModal: false,
      showEditUserModal: false,
      showGenericAdminModal: false,
      showRestoreAccountModal: false,
      showError: false,
      showSuccess: false,
      messageNewUserModal: '',
      messageEditUserModal: '',
      messageRestoreAccountModal: '',
      processingSummaryUserFile: '',
      alertMessage: null,
      filterCriteria: {}
    };
    this.handleFetchUsers = this.handleFetchUsers.bind(this);
    this.handleMsgShow = this.handleMsgShow.bind(this);
    this.handleMsgClose = this.handleMsgClose.bind(this);
    this.handleNewUserShow = this.handleNewUserShow.bind(this);
    this.handleNewUserClose = this.handleNewUserClose.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.messageSend = this.messageSend.bind(this);
    this.handleCreateNewUser = this.handleCreateNewUser.bind(this);
    this.handleEditUserShow = this.handleEditUserShow.bind(this);
    this.handleEditUserClose = this.handleEditUserClose.bind(this);
    this.handleUpdateUser = this.handleUpdateUser.bind(this);
    this.handleRestoreAccountShow = this.handleRestoreAccountShow.bind(this);
    this.handleRestoreAccountClose = this.handleRestoreAccountClose.bind(this);
    this.handleRestoreAccount = this.handleRestoreAccount.bind(this);
    this.handleGenericAdminModal = this.handleGenericAdminModal.bind(this);
    this.handleGenericAdminModalCb = this.handleGenericAdminModalCb.bind(this);
    this.handleDismissAlert = this.handleDismissAlert.bind(this);
    this.handleShowAlert = this.handleShowAlert.bind(this);
    this.tableBodyRef = React.createRef();
  }

  componentDidMount() {
    this.handleFetchUsers();
    // update maxHeight for user table body
    if (this.tableBodyRef?.current) {
      // Get the available space
      const availableSpace = window.innerHeight - this.tableBodyRef.current.getBoundingClientRect().top;

      // Set the max-height dynamically
      this.tableBodyRef.current.style.maxHeight = `${availableSpace}px`;
    }
    return true;
  }

  componentWillUnmount() {
  }

  handleMsgShow() {
    this.setState({
      showMsgModal: true
    });
  }

  handleMsgClose() {
    this.setState({
      showMsgModal: false
    });
  }

  handleNewUserShow() {
    this.setState({
      showNewUserModal: true,
      messageNewUserModal: ''
    });
  }

  handleNewUserClose() {
    this.setState({
      showNewUserModal: false,
      messageNewUserModal: ''
    });
  }

  handleEditUserShow(user) {
    this.setState({
      showEditUserModal: true,
      messageEditUserModal: '',
      user
    });
  }

  handleEditUserClose() {
    this.setState({
      showEditUserModal: false,
      messageEditUserModal: '',
      user: {}
    });
  }

  handleRestoreAccountShow() {
    this.setState({
      showRestoreAccountModal: true,
      messageRestoreAccountModal: '',
      showSuccess: false,
      showError: false,
      deletedUsers: [],
    });
  }

  handleRestoreAccountClose() {
    this.setState({
      showRestoreAccountModal: false,
    });
    this.handleFetchUsers();
  }

  handleDismissAlert() {
    this.setState({ alertMessage: null });
  }

  handleShowAlert(message) {
    this.setState({ alertMessage: message });
  }

  handleGenericAdminModalCb(user) {
    const { users } = this.state;
    const { id, error } = user;
    if (error) { this.setState({ alertMessage: error }); }
    this.setState({
      users: users.map((u) => (u.id === id ? user : u)),
      user,
    });
  }

  handleGenericAdminModal(show, user = {}) {
    this.setState({ showGenericAdminModal: show, user });
  }

  handleFetchUsers() {
    AdminFetcher.fetchUsers()
      .then((result) => {
        this.setState({
          users: result.users
        });
      });
  }

  handleEnableDisableAccount(id, lockedAt) {
    const message = lockedAt !== null ? 'Account unlocked!' : 'Account locked! User can unlock it under condition'; //
    this.updateUser({ id, enable: lockedAt !== null }, message);
  }

  handleConverterAdmin(id, isConverterAdmin) {
    const message = `Converter-profiles editing has been ${isConverterAdmin === true ? 'dis' : 'en'}abled for user ${id}`;
    this.updateProfile({ user_id: id, converter_admin: !isConverterAdmin }, message);
  }

  handleTemplatesModerator(id, isTemplatesModerator) {
    const message = `Ketcher-template editing has been ${isTemplatesModerator === true ? 'en' : 'dis'}abled for user ${id}`;
    this.updateProfile({ user_id: id, is_templates_moderator: !isTemplatesModerator }, message);
  }

  handleMoleculesModerator(id, isMoleculesEditor) {
    const message = isMoleculesEditor === true
      ? 'Disable editing the representation of the global molecules for this user'
      : 'Enable editing the representation of the global molecules for this user';
    this.updateProfile({ user_id: id, molecule_editor: !isMoleculesEditor }, message);
  }

  handleActiveInActiveAccount(id, isActive) {
    const message = `User ${id} account has been ${isActive === true ? 'de-' : ''}activated!`;
    this.updateUser({ id, account_active: !isActive }, message);
  }

  handleSelectUser(val) {
    this.setState({ selectedUsers: val });
  }

  handleConfirmUserAccount(id) {
    this.updateUser({ id, confirm_user: true }, `User ${id} account has been confirmed!`);
  }

  handleReConfirmUserAccount(id) {
    this.updateUser({ id, reconfirm_user: true }, `User ${id} new Email has been confirmed!`);
  }

  handleCreateNewUser() {
    if (!this.validateUserInput()) {
      return false;
    }
    AdminFetcher.createUserAccount({
      email: this.email.value.trim(),
      password: this.password.value.trim(),
      first_name: this.firstname.value.trim(),
      last_name: this.lastname.value.trim(),
      name_abbreviation: this.nameAbbr.value.trim(),
      type: this.type.value
    })
      .then((result) => {
        if (result.error) {
          this.setState({ messageNewUserModal: result.error });
          return false;
        }
        this.setState({ messageNewUserModal: 'New user created.' });
        this.email.value = '';
        this.password.value = '';
        this.passwordConfirm.value = '';
        this.firstname.value = '';
        this.lastname.value = '';
        this.nameAbbr.value = '';
        this.handleFetchUsers();
        return true;
      });
    return true;
  }

  handleOnDropUserFile = (data, file) => {
    const validFileTypes = ['text/csv', 'application/vnd.ms-excel'];
    if (!validFileTypes.includes(file.type)) {
      this.setState(
        { processingSummaryUserFile: `Invalid file type ${file.type}. Please make sure to upload a CSV file.` }
      );
      this.newUsers = null;
      return false;
    }
    this.newUsers = data;
    for (let i = 0; i < this.newUsers.length; i += 1) {
      this.newUsers[i].data.row = i + 1;
    }
    return true;
  };

  handleOnErrorUserFile = (err) => {
    console.log(err);
    this.newUsers = null;
  };

  handleOnRemoveUserFile = () => {
    this.newUsers = null;
  };

  handleCreateNewUsersFromFile() {
    if (!this.validUserFile()) {
      this.newUsers = null;
      this.setState({ messageNewUserModal: 'Finished processing user file.' });
    } else {
      const promisedNewUsers = this.newUsers.map((user) => this.createNewUserFromFile(user));
      Promise.allSettled(promisedNewUsers)
        .then((userResults) => {
          this.showProcessingSummaryUserFile(userResults);
        })
        .then(() => this.handleFetchUsers())
        .catch((reason) => {
          this.setState({ messageNewUserModal: `Failed to process user file: ${reason}.` });
        });
    }
  }

  handleUpdateUser(user) {
    if (!validateEmail(this.u_email.value.trim())) {
      this.setState({ messageEditUserModal: 'You have entered an invalid email address!' });
      return false;
    } if (this.u_firstname.value.trim() === '' || this.u_lastname.value.trim()
      === '' || this.u_abbr.value.trim() === '') {
      this.setState({ messageEditUserModal: 'please input first name, last name and name abbreviation!' });
      return false;
    }
    if (this.u_avail.value < 0) this.u_avail.value = 0;

    AdminFetcher.updateUser({
      id: user.id,
      email: this.u_email.value.trim(),
      first_name: this.u_firstname.value.trim(),
      last_name: this.u_lastname.value.trim(),
      name_abbreviation: this.u_abbr.value.trim(),
      type: this.u_type.value,
      available_space: this.u_avail.value === '' ? 0 : this.u_avail.value * 1024 * 1024
    })
      .then((result) => {
        if (result.error) {
          this.setState({ messageEditUserModal: result.error });
          return false;
        }
        // update this.state.users with result
        const { users } = this.state;
        const index = users.findIndex((u) => u.id === user.id);
        users[index] = result;

        this.setState({
          users,
          showEditUserModal: false,
          messageEditUserModal: '',
          alertMessage: `User ${user.id} account has been updated.`
        });
        this.u_email.value = '';
        this.u_firstname.value = '';
        this.u_lastname.value = '';
        this.u_abbr.value = '';
        this.u_avail.value = 0;
        return true;
      });

    if (this.u_type.value === 'Group') { // update available space for all users of group
      AdminFetcher.updateUsersOfGroup({
        id: user.id,
        available_space: this.u_avail.value === '' ? 0 : this.u_avail.value * 1024 * 1024
      })
        .then((result) => JSON.parse(result))
        .then((json) => {
          const { users } = this.state;
          json.forEach((gUser) => {
            const index = users.findIndex((u) => u.id === gUser.id);
            users[index].available_space = gUser.available_space;
          });
          this.setState({ users });
          return true;
        });
    }
    return true;
  }

  handleDeleteUser(user) {
    AdminFetcher.deleteUser({ id: user.id }).then(
      (result) => {
        if (result.error) {
          this.setState({ showEditUserModal: false, alertMessage: result.error });
          return false;
        }
        // remove deleted user from this.state.users
        const { users } = this.state;
        const index = users.findIndex((u) => u.id === user.id);
        if (index > -1) {
          users.splice(index, 1);
        }
        this.setState({
          showEditUserModal: false,
          alertMessage: `User with name abbreviation ${user.initials} has been deleted!`,
          users,
        });
        return true;
      }
    );
  }

  handleRestoreAccount = () => {
    this.setState({ deletedUsers: [] });

    this.id.value = this.id.value.trim();
    this.nameAbbreviation.value = this.nameAbbreviation.value.trim();
    if (this.nameAbbreviation.value.trim() === '' && this.id.value.trim() === '') {
      this.setState({ messageRestoreAccountModal: 'Please enter the name abbreviation or an id!', showError: true });
      return false;
    }
    AdminFetcher.restoreAccount({
      name_abbreviation: this.nameAbbreviation.value === '' ? null : this.nameAbbreviation.value,
      id: this.id.value === '' ? null : this.id.value,

    }).then((result) => {
      if (result?.users) {
        this.setState({ messageRestoreAccountModal: result.message, showError: true, deletedUsers: result.users });
        return false;
      }

      if (result.status === 'error' || result.status === 'warning') {
        this.setState({ messageRestoreAccountModal: result.message, alertMessage: result.message, showError: true });
        return false;
      }
      this.setState({ messageRestoreAccountModal: result.message, alertMessage: result.message, showSuccess: true });
      setTimeout(() => {
        this.nameAbbreviation.value = '';
        this.id.value = '';
        this.handleRestoreAccountClose();
      }, 2000);
      return true;
    });
    return true;
  };

  updateFilter = (key, value) => {
    this.setState((prevState) => ({
      filterCriteria: {
        ...prevState.filterCriteria,
        [key]: value
      }
    }));
  };

  updateUser(params, message = null) {
    const { users } = this.state;
    AdminFetcher.updateUser(params)
      .then((result) => {
        if (result.error) {
          this.handleShowAlert(result.error);
          return false;
        }
        this.setState({
          users: users.map((user) => (user.id === params.id ? result : user)),
          user: result,
          alertMessage: message
        });
        return true;
      });
  }

  updateProfile(params, message = null) {
    const { users } = this.state;
    AdminFetcher.updateAccount(params)
      .then((result) => {
        if (result.error) {
          this.handleShowAlert(result.error);
          return false;
        }
        this.setState({
          users: users.map((user) => (user.id === result.id ? result : user)),
          user: result,
          alertMessage: message
        });
        return true;
      });
  }

  updateDropdownFilter(field, value) {
    this.setState((prevState) => ({
      filterCriteria: {
        ...prevState.filterCriteria,
        [field]: value
      }
    }));
  }

  createNewUserFromFile(newUser) {
    return AdminFetcher.createUserAccount({
      email: newUser.data.email.trim(),
      password: newUser.data.password.trim(),
      first_name: newUser.data.firstname.trim(),
      last_name: newUser.data.lastname.trim(),
      name_abbreviation: newUser.data.nameabbr.trim(),
      type: newUser.data.type.trim()
    })
      .then((result) => {
        let userResult = `Row ${newUser.data.row}: Successfully created new user.`;
        if (result.error) {
          userResult = `Row ${newUser.data.row}: Failed to create user; ${result.error}.`;
        }
        this.setState({ messageNewUserModal: userResult });
        return userResult;
      });
  }

  validUserFile() {
    if (!Array.isArray(this.newUsers) || !this.newUsers.length) {
      this.setState({ processingSummaryUserFile: 'The file is empty.' });
      return false;
    }

    const nUsers = this.newUsers.length;
    const nUsersMax = 100;
    if (nUsers > nUsersMax) {
      this.setState({
        processingSummaryUserFile: 'The file contains too many users. '
          + `Please make sure that the number of users you add from a single file doesn't exceed ${nUsersMax}.`
      });
      return false;
    }

    const fileHeader = this.newUsers[0].meta.fields;
    const validHeader = ['email', 'password', 'firstname', 'lastname', 'nameabbr', 'type'];
    if (!(fileHeader.length === validHeader.length
      && fileHeader.every((val, index) => val === validHeader[index]))) {
      this.setState({
        processingSummaryUserFile: `The file contains an invalid header ${fileHeader}. `
          + `Please make sure that your file's header is organized as follows: ${validHeader}.`
      });
      return false;
    }

    let parsingErrorMessage = '';
    this.newUsers.forEach((user) => {
      const parsingErrors = user.errors;
      if (parsingErrors.length) {
        parsingErrors.forEach((error) => {
          parsingErrorMessage += `Row ${user.data.row}: The user could not be parsed correctly; ${error.message}\n\n`;
        });
      }
    });
    if (!(parsingErrorMessage === '')) {
      this.setState({ processingSummaryUserFile: parsingErrorMessage });
      return false;
    }

    // We need to guard against invalid user types when creating multiple users from file,
    // since user type is not validated on the backend.
    // The backend doesn't validate user type because in the modal for adding a single users,
    // the user type cannot be invalid since it's selected from a dropdown.
    // However, when multiple users are created from a file, type can be any string.
    const validTypes = ['Person', 'Admin'];
    let invalidTypeMessage = '';
    this.newUsers.forEach((user) => {
      const userType = user.data.type.trim();
      if (!validTypes.includes(userType)) {
        invalidTypeMessage += `Row ${user.data.row}: The user's type "${userType}" is invalid. `
          + `Please select a valid type from ${validTypes}.\n\n`;
      }
    });
    if (!(invalidTypeMessage === '')) {
      this.setState({ processingSummaryUserFile: invalidTypeMessage });
      return false;
    }

    const sortedUserEmails = this.newUsers.map((user) => user.data.email).sort();
    const duplicateUserEmails = new Set();
    for (let i = 0; i < sortedUserEmails.length - 1; i += 1) {
      if (sortedUserEmails[i + 1] === sortedUserEmails[i]) {
        duplicateUserEmails.add(sortedUserEmails[i]);
      }
    }
    if (duplicateUserEmails.size) {
      this.setState({
        processingSummaryUserFile: 'The file contains duplicate user '
          + `emails: ${Array.from(duplicateUserEmails.values())}. Please make sure that each user has a unique email.`
      });
      return false;
    }

    return true;
  }

  showProcessingSummaryUserFile(userResults) {
    let summary = '';
    userResults.forEach((result) => {
      summary += `${result.value}\n\n`;
    });
    this.setState({
      messageNewUserModal: 'Finished processing user file.',
      processingSummaryUserFile: summary
    });
  }

  validateUserInput() {
    if (this.email.value === '') { // also validated in backend
      this.setState({ messageNewUserModal: 'Please input email.' });
      return false;
    } if (!validateEmail(this.email.value.trim())) { // also validated in backend
      this.setState({ messageNewUserModal: 'You have entered an invalid email address!' });
      return false;
    } if (this.password.value.trim() === '' || this.passwordConfirm.value.trim() === '') {
      this.setState({ messageNewUserModal: 'Please input password with correct format.' });
      return false;
    } if (this.password.value.trim() !== this.passwordConfirm.value.trim()) {
      this.setState({ messageNewUserModal: 'passwords do not mach!' });
      return false;
    } if (this.password.value.trim().length < 8) { // also validated in backend
      this.setState({ messageNewUserModal: 'Password is too short (minimum is 8 characters)' });
      return false;
    } if (this.firstname.value.trim() === '' || this.lastname.value.trim() === ''
      || this.nameAbbr.value.trim() === '') { // also validated in backend
      this.setState({ messageNewUserModal: 'Please input First name, Last name and Name abbreviation' });
      return false;
    }
    return true;
  }

  async messageSend() {
    const { selectedUsers } = this.state;
    if (this.myMessage.value === '') {
      this.handleShowAlert('Please input the message!');
    } else if (!selectedUsers || selectedUsers.length === 0) {
      this.handleShowAlert('Please select user(s)!');
    } else {
      const userIds = [];
      selectedUsers.map((g) => {
        userIds.push(g.value);
        return true;
      });

      try {
        const result = await MessagesFetcher.channelIndividualUsers();

        if (!result || !result.id) {
          throw new Error('Failed to create or fetch the channel.');
        }

        const params = {
          channel_id: result.id,
          content: this.myMessage.value,
          user_ids: userIds
        };

        await MessagesFetcher.createMessage(params);

        this.myMessage.value = '';
        this.setState({ selectedUsers: null });
        this.handleMsgClose();
      } catch (error) {
        console.error('Error sending message:', error);
        this.handleShowAlert('An error occured: Try again later or contact your system administrator if it persists.');
      }
    }
  }

  renderMessageModal() {
    const { selectedUsers } = this.state;
    return (
      <Modal
        centered
        show={this.state.showMsgModal}
        onHide={this.handleMsgClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Send Message</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formControlsTextarea">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                placeholder="Message..."
                rows="20"
                ref={(ref) => { this.myMessage = ref; }}
              />
            </Form.Group>
            <Form.Group className="my-3">
              <AsyncSelect
                isMulti
                value={selectedUsers}
                matchProp="name"
                placeholder="Select users"
                loadOptions={loadUserByName}
                onChange={this.handleSelectUser}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <Button variant="primary" onClick={() => this.messageSend()}>
            Send
            <i className="fa fa-paper-plane ms-1" />
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  renderNewUserModal() {
    return (
      <Modal
        centered
        show={this.state.showNewUserModal}
        onHide={this.handleNewUserClose}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs id="createUserTabs" className="fs-6">
            <Tab eventKey="singleUser" title="Single user">
              <Form
                className="ms-2 mt-2"
              >
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlEmail"
                >
                  <Form.Label>
                    Email:
                  </Form.Label>
                  <Form.Control type="email" name="email" ref={(ref) => { this.email = ref; }} />
                </Form.Group>
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlPassword"
                >
                  <Form.Label>
                    Password:
                  </Form.Label>
                  <Form.Control type="password" name="password" ref={(ref) => { this.password = ref; }} />
                </Form.Group>
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlPasswordConfirmation"
                >
                  <Form.Label>
                    Password Confirmation:
                  </Form.Label>
                  <Form.Control type="password" ref={(ref) => { this.passwordConfirm = ref; }} />
                </Form.Group>
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlFirstName"
                >
                  <Form.Label>
                    First name:
                  </Form.Label>
                  <Form.Control type="text" name="firstname" ref={(ref) => { this.firstname = ref; }} />
                </Form.Group>
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlLastName"
                >
                  <Form.Label>
                    {' '}
                    Last name:
                  </Form.Label>
                  <Form.Control type="text" name="lastname" ref={(ref) => { this.lastname = ref; }} />
                </Form.Group>
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlAbbr"
                >
                  <Form.Label>
                    Abbr (3) *:
                  </Form.Label>
                  <Form.Control type="text" name="nameAbbr" ref={(ref) => { this.nameAbbr = ref; }} />
                </Form.Group>
                <Form.Group
                  className="w-75 mb-3"
                  controlId="formControlsType"
                >
                  <Form.Label>
                    Type:
                  </Form.Label>
                  <Form.Select ref={(ref) => { this.type = ref; }}>
                    <option value="Person">Person</option>
                    <option value="Admin">Admin</option>
                  </Form.Select>
                </Form.Group>
              </Form>
              <Button variant="primary" className="mt-3 ms-2" onClick={() => this.handleCreateNewUser()}>
                Create user
                <i className="fa fa-plus ms-1" />
              </Button>

            </Tab>
            <Tab eventKey="multiUser" title="Multiple users from file">
              <Form className="my-3">
                <Form.Group>
                  <Form.Label>Please format the user file like the table below.</Form.Label>
                  <Table striped bordered hover className="mt-1">
                    <thead>
                      <tr>
                        <th>email</th>
                        <th>password</th>
                        <th>firstname</th>
                        <th>lastname</th>
                        <th>nameabbr</th>
                        <th>type</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>john.doe@eln.edu</td>
                        <td>password0</td>
                        <td>John</td>
                        <td>Doe</td>
                        <td>jod</td>
                        <td>Person</td>
                      </tr>
                      <tr>
                        <td>jane.doe@eln.edu</td>
                        <td>password1</td>
                        <td>Jane</td>
                        <td>Doe</td>
                        <td>jad</td>
                        <td>Person</td>
                      </tr>
                    </tbody>
                  </Table>
                </Form.Group>
                <Form.Group id="userFileDragAndDrop">
                  <CSVReader
                    onDrop={this.handleOnDropUserFile}
                    onError={this.handleOnErrorUserFile}
                    config={{ header: true, skipEmptyLines: true }}
                    addRemoveButton
                    onRemoveFile={this.handleOnRemoveUserFile}
                    className="my-1"
                  >
                    <span>
                      Drop a CSV user file here or click to upload.
                      The following column-delimiters are accepted: &apos;,&apos; or &apos;;&apos; or &apos;tab&apos;.
                    </span>
                  </CSVReader>
                </Form.Group>
                <Button variant="primary" className="my-3" onClick={() => this.handleCreateNewUsersFromFile()}>
                  Create users
                  <i className="fa fa-plus ms-1" />
                </Button>
                <Form.Group>
                  <Form.Label>Processing Summary</Form.Label>
                  <Form.Control
                    readOnly
                    as="textarea"
                    id="processingSummary"
                    rows={5}
                    value={this.state.processingSummaryUserFile}
                  />
                </Form.Group>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <Form.Group controlId="formControlMessage" className="flex-grow-1">
            <Form.Control type="text" readOnly name="messageNewUserModal" value={this.state.messageNewUserModal} />
          </Form.Group>
          <Button variant="warning" className="fs-6" onClick={() => this.handleNewUserClose()}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  renderEditUserModal() {
    const { user } = this.state;
    return (
      <Tab.Container id="tabs-with-dropdown" defaultActiveKey="first">
        <Modal
          centered
          show={this.state.showEditUserModal}
          onHide={this.handleEditUserClose}
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <Nav variant="tabs">
                <NavItem>
                  <Nav.Link eventKey="first">Edit user account </Nav.Link>
                </NavItem>
                <NavItem>
                  <Nav.Link eventKey="second">Delete user</Nav.Link>
                </NavItem>
              </Nav>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Tab.Content animation>
              <Tab.Pane eventKey="first">
                <Form>
                  <Form.Group as={Row} className="mb-3 ms-5 mt-2" controlId="formControlEmail">
                    <Form.Label column sm="3" className="fs-6">
                      Email:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="email"
                        name="u_email"
                        defaultValue={user.email}
                        ref={(ref) => { this.u_email = ref; }}
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlFirstName">
                    <Form.Label column sm="3" className="fs-6">
                      First name:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="text"
                        name="u_firstname"
                        defaultValue={user.first_name}
                        ref={(ref) => { this.u_firstname = ref; }}
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlLastName">
                    <Form.Label column sm="3" className="fs-6">
                      Last name:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="text"
                        name="u_lastname"
                        defaultValue={user.last_name}
                        ref={(ref) => { this.u_lastname = ref; }}
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlAbbr">
                    <Form.Label column sm="3" className="fs-6">
                      Abbr:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="text"
                        name="u_abbr"
                        defaultValue={user.initials}
                        ref={(ref) => { this.u_abbr = ref; }}
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlAvail">
                    <Form.Label column sm="3" className="fs-6">
                      Available Space (MB):
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="number"
                        min="1"
                        name="u_avail"
                        defaultValue={user.available_space === 0 ? '' : user.available_space / 1024 / 1024}
                        ref={(ref) => { this.u_avail = ref; }}
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlsType">
                    <Form.Label column sm="3" className="fs-6">
                      Type:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Select
                        defaultValue={user.type}
                        ref={(ref) => { this.u_type = ref; }}
                        className="fs-6"
                      >
                        <option value="Person">Person</option>
                        <option value="Group">Group</option>
                        <option value="Admin">Admin</option>
                      </Form.Select>
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlMessage">
                    <Col sm="10">
                      <Form.Control
                        type="text"
                        readOnly
                        name="messageEditUserModal"
                        value={this.state.messageEditUserModal}
                        className="my-3 form-control text-danger text-center fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3">
                    <Col sm="6">
                      <Button variant="secondary" className="w-100" onClick={() => this.handleEditUserClose()}>
                        Cancel
                      </Button>
                    </Col>
                    <Col sm="6">
                      <Button variant="primary" className="w-100" onClick={() => this.handleUpdateUser(user)}>
                        Update
                        <i className="fa fa-save ms-1" />
                      </Button>
                    </Col>
                  </Form.Group>
                </Form>
              </Tab.Pane>
              <Tab.Pane eventKey="second">
                <Form>
                  <Form.Group as={Row} className="mb-3 mt-2 ms-5" controlId="formControlEmail">
                    <Form.Label column sm="3" className="fs-6">
                      Email:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="email"
                        name="u_email"
                        defaultValue={user.email}
                        disabled
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlFirstName">
                    <Form.Label column sm="3" className="fs-6">
                      First name:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="text"
                        name="u_firstname"
                        defaultValue={user.first_name}
                        disabled
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlLastName">
                    <Form.Label column sm="3" className="fs-6">
                      Last name:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="text"
                        name="u_lastname"
                        defaultValue={user.last_name}
                        disabled
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlAbbr">
                    <Form.Label column sm="3" className="fs-6">
                      Abbr:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        type="text"
                        name="u_abbr"
                        defaultValue={user.initials}
                        disabled
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlsType">
                    <Form.Label column sm="3" className="fs-6">
                      Type:
                    </Form.Label>
                    <Col sm="7">
                      <Form.Control
                        disabled
                        defaultValue={user.type}
                        className="fs-6"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3 ms-5" controlId="formControlMessage">
                    <Col sm="10">
                      <Form.Control
                        type="text"
                        readOnly
                        name="messageEditUserModal"
                        value="Delete User Account. Are you sure?"
                        className="my-3 fs-6 form-control text-danger text-center"
                      />
                    </Col>
                  </Form.Group>
                  <Form.Group as={Row} className="mb-3">
                    <Col sm="6">
                      <Button variant="secondary" className="w-100" onClick={() => this.handleEditUserClose()}>
                        Cancel
                      </Button>
                    </Col>
                    <Col sm="6">
                      <Button variant="danger" className="w-100" onClick={() => this.handleDeleteUser(user)}>
                        Delete
                        <i className="fa fa-trash ms-1" />
                      </Button>
                    </Col>
                  </Form.Group>
                </Form>
              </Tab.Pane>
            </Tab.Content>
          </Modal.Body>
        </Modal>
      </Tab.Container>
    );
  }

  renderRestoreAccountModal() {
    return (
      <Modal centered show={this.state.showRestoreAccountModal} onHide={this.handleRestoreAccountClose}>
        <Modal.Header closeButton>
          <Modal.Title>Restore account</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex justify-content-center align-items-center">
          <Form className="w-75">
            <Form.Group controlId="formControlAbbr">
              <Row className="mb-3">
                <Col column sm={3}>
                  <Form.Label column sm={3} className=" fs-6">Abbr: </Form.Label>
                </Col>
                <Col sm={9}>
                  <Form.Control
                    type="text"
                    name="nameAbbreviation"
                    placeholder="Please enter the name abbreviation .."
                    className="flex-grow-1"
                    ref={(ref) => {
                      this.nameAbbreviation = ref;
                    }}
                  />
                </Col>
              </Row>
            </Form.Group>
            <Form.Group controlId="formControlID">
              <Row className="mb-3">
                <Col column sm={3}>
                  <Form.Label className="fs-6">ID:</Form.Label>
                </Col>
                <Col sm={9}>
                  <Form.Control
                    type="text"
                    name="id"
                    placeholder=".. or enter the user ID"
                    defaultValue=""
                    onFocus={() => this.setState({ showError: false, showSuccess: false })}
                    ref={(ref) => {
                      this.id = ref;
                    }}
                  />
                </Col>
              </Row>

            </Form.Group>
            <Form.Group controlId="formControlMessage">
              <Col sm={12}>
                <Form.Control
                  className="mt-3"
                  type="text"
                  readOnly
                  name="messageRestoreAccountModal"
                  value={this.state.messageRestoreAccountModal}
                  isValid={this.state.showSuccess}
                  isInvalid={this.state.showError}
                />
              </Col>
            </Form.Group>
            {this.state.deletedUsers.length > 0
                && renderDeletedUsersTable(this.state.deletedUsers)}
          </Form>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <Button variant="primary" className="fs-6" onClick={() => this.handleRestoreAccount()}>
            Restore
            <i className="fa fa-save ms-1" />
          </Button>
          <Button variant="warning" className="fs-6" onClick={() => this.handleRestoreAccountClose()}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  renderGenericAdminModal() {
    const { user, showGenericAdminModal } = this.state;
    if (showGenericAdminModal) {
      return (
        <GenericAdminModal
          user={user}
          fnShowModal={this.handleGenericAdminModal}
          fnCb={this.handleGenericAdminModalCb}
        />
      );
    }
    return null;
  }

  render() {
    const renderConfirmButton = (show, userId) => {
      if (show) {
        return (
          <OverlayTrigger placement="bottom" overlay={confirmUserTooltip}>
            <Button
              size="sm"
              variant="info"
              onClick={() => this.handleConfirmUserAccount(userId, false)}
            >
              <i className="fa fa-check-square" />
            </Button>
          </OverlayTrigger>
        );
      }
      return <span />;
    };
    /* eslint-disable camelcase */
    const renderReConfirmButton = (unconfirmed_email, userId) => {
      if (unconfirmed_email) {
        return (
          <OverlayTrigger placement="bottom" overlay={confirmEmailChangeTooltip(unconfirmed_email)}>
            <Button
              size="sm"
              variant="warning"
              onClick={() => this.handleReConfirmUserAccount(userId)}
            >
              <i className="fa fa-check-square" />
            </Button>
          </OverlayTrigger>
        );
      }
      return <span />;
    };/* eslint-enable camelcase */

    const { users, filterCriteria } = this.state;

    // filtering logic
    const filteredUsers = users.filter((user) => Object.keys(filterCriteria).every((key) => {
      // skip if filter field is empty
      if (!filterCriteria[key]) return true;
      // special case for dropdowns
      if (key === 'account_active' || key === 'locked_at' || key === 'type') {
        return filterCriteria[key] === (user[key] ? 'true' : 'false') || filterCriteria[key] === user[key];
      }
      return String(user[key]).toLowerCase().includes(String(filterCriteria[key]).toLowerCase());
    }));

    const tcolumn = (
      <thead className="bg-gray-200">
        <tr className="align-middle fs-4 py-3">
          <th className="col-auto fs-4 py-3">#</th>
          <th className="col-2 col-md-3 fs-4 py-3">Actions</th>
          <th className="col-3 col-md-2 fs-4 py-3">Name</th>
          <th className="col-2 fs-4 py-3">Abbr.</th>
          <th className="col-3 col-md-2 fs-4 py-3">Email</th>
          <th className="col-2 fs-4 py-3">Type</th>
          <th className="col-3 col-md-2 fs-4 py-3">Disk Usage</th>
          <th className="col-3 col-md-2 fs-4 py-3">Login at</th>
          <th className="col-1 fs-4 py-3">ID</th>
        </tr>
        <tr>
          <th aria-label="Empty header for the '#' column" />
          <th className="fs-6 py-3">
            <div className="d-flex justify-content-between">
              <Col xs={5}>
                <Form.Select
                  aria-label="Filter Active-Inactive"
                  onChange={(e) => this.updateDropdownFilter('account_active', e.target.value)}
                >
                  <option value="">Active & Inactive</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Form.Select>
              </Col>
              <Col xs={5}>
                <Form.Select
                  aria-label="Filter Locked-Unlocked"
                  onChange={(e) => this.updateDropdownFilter('locked_at', e.target.value)}
                >
                  <option value="">Locked & Unlocked</option>
                  <option value="true">Locked</option>
                  <option value="false">Unlocked</option>
                </Form.Select>
              </Col>
            </div>
          </th>
          <th className="fs-6 py-3">
            <Form.Control
              type="text"
              placeholder="Name"
              onChange={(e) => this.updateFilter('name', e.target.value)}
            />
          </th>
          <th className="fs-6 py-3">
            <Form.Control
              type="text"
              placeholder="Abbr."
              onChange={(e) => this.updateFilter('initials', e.target.value)}
            />
          </th>
          <th className="fs-6 py-3">
            <Form.Control
              type="text"
              placeholder="Email"
              onChange={(e) => this.updateFilter('email', e.target.value)}
            />
          </th>
          <th className="fs-6 py-3">
            <Form.Select
              aria-label="Filter Person-Admin"
              onChange={(e) => this.updateDropdownFilter('type', e.target.value)}
            >
              <option value="">All</option>
              <option value="Person">Person</option>
              <option value="Admin">Admin</option>
            </Form.Select>
          </th>
          <th className="fs-6 py-3" aria-label="Empty header for the 'Disk Usage' column" />
          <th className="fs-6 py-3" aria-label="Empty header for the 'Login at' column" />
          <th className="fs-6 py-3" aria-label="Empty header for the 'ID' column" />
        </tr>
      </thead>
    );

    const tbody = filteredUsers.map((g, idx) => (
      <tr key={`row_${g.id}`} className="align-middle">
        <td className="col-auto py-3">
          {idx + 1}
        </td>
        <td className="col-md-3 col-lg-2">
          <OverlayTrigger placement="bottom" overlay={editTooltip}>
            <Button
              size="sm"
              variant="info"
              onClick={() => this.handleEditUserShow(g)}
              className="me-1"
            >
              <i className="fa fa-user" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={resetPasswordTooltip}>
            <Button
              size="sm"
              variant="success"
              onClick={() => handleResetPassword(g.id, true, this.handleShowAlert)}
              className="me-1"
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={resetPasswordInstructionsTooltip}>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleResetPassword(g.id, false, this.handleShowAlert)}
              className="me-1"
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={g.locked_at === null ? disableTooltip : enableTooltip}>
            <Button
              size="sm"
              variant={g.locked_at === null ? 'light' : 'warning'}
              onClick={() => this.handleEnableDisableAccount(g.id, g.locked_at, false)}
              className="me-1"
            >
              <i className={g.locked_at === null ? 'fa fa-lock' : 'fa fa-unlock'} />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={(g.converter_admin === null || g.converter_admin === false) ? converterEnableTooltip : converterDisableTooltip}>
            <Button
              size="sm"
              variant={(g.converter_admin === null || g.converter_admin === false) ? 'light' : 'success'}
              onClick={() => this.handleConverterAdmin(g.id, g.converter_admin, false)}
              className="me-1"
            >
              <i className="fa fa-hourglass-half" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={(g.is_templates_moderator === null || g.is_templates_moderator === false) ? templateModeratorEnableTooltip : templateModeratorDisableTooltip}>
            <Button
              size="sm"
              variant={(g.is_templates_moderator === null || g.is_templates_moderator === false) ? 'light' : 'success'}
              onClick={() => this.handleTemplatesModerator(g.id, g.is_templates_moderator, false)}
              className="me-1"
            >
              <i className="fa fa-book" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={(g.molecule_editor == null || g.molecule_editor === false) ? moleculeModeratorEnableTooltip : moleculeModeratorDisableTooltip}>
            <Button
              size="sm"
              variant={(g.molecule_editor === null || g.molecule_editor === false) ? 'light' : 'success'}
              onClick={() => this.handleMoleculesModerator(g.id, g.molecule_editor, false)}
              className="me-1"
            >
              <i className="icon-sample" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="generic_tooltip">Grant/Revoke Generic Designer</Tooltip>}>
            <Button
              size="sm"
              variant={(g.generic_admin?.elements || g.generic_admin?.segments || g.generic_admin?.datasets) ? 'success' : 'light'}
              onClick={() => this.handleGenericAdminModal(true, g)}
              className="me-1"
            >
              <i className="fa fa-empire" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={!g.account_active ? accountActiveTooltip : accountInActiveTooltip}>
            <Button
              size="sm"
              variant={g.account_active === true ? 'light' : 'danger'}
              onClick={() => this.handleActiveInActiveAccount(g.id, g.account_active)}
            >
              <i className={g.account_active === true ? 'fa fa-user-circle' : 'fa fa-user-times'} aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          {renderConfirmButton(g.type !== 'Device' && (g.confirmed_at == null || g.confirmed_at.length <= 0), g.id)}
          {renderReConfirmButton(g.unconfirmed_email, g.id)}
        </td>
        <td className="col-md-2 py-3">
          {g.name}
        </td>
        <td className="col-md-1 py-3">
          {g.initials}
        </td>
        <td className="col-md-2 py-3">
          {g.email}
        </td>
        <td className="col-md-1 py-3">
          {g.type}
        </td>
        <td className="col-md-2 py-3">
          {g.available_space === 0 ? ''
            : `${Math.round((g.used_space / g.available_space) * 100)}% of ${g.available_space / 1024 / 1024}MB`}
        </td>
        <td className="col-md-2 py-3">
          {g.current_sign_in_at}
        </td>
        <td className="col-auto py-3">
          {g.id}
        </td>
      </tr>
    ));

    return (
      <div>
        <MessageAlert message={this.state.alertMessage} onHide={this.handleDismissAlert} />
        <Card>
          <Card.Body>
            <Button variant="warning" size="md" className="me-1" onClick={() => this.handleMsgShow()}>
              Send Message
              <i className="fa fa-commenting-o ms-1" />
            </Button>
            <Button variant="primary" size="md" className="me-1" onClick={() => this.handleNewUserShow()} data-cy="create-user">
              New User
              <i className="fa fa-plus ms-1" />
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => this.handleRestoreAccountShow()}
              data-cy="restore-user"
              className="me-1"
            >
              Restore Account
              <i className="fa fa-undo ms-1" />
            </Button>
          </Card.Body>
        </Card>
        <div ref={this.tableBodyRef}>
          <Table responsive className="table border">
            {tcolumn}
            <tbody>
              {tbody}
            </tbody>
          </Table>
        </div>
        {this.renderMessageModal()}
        {this.renderNewUserModal()}
        {this.renderEditUserModal()}
        {this.renderRestoreAccountModal()}
        {this.renderGenericAdminModal()}
      </div>
    );
  }
}
