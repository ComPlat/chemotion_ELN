import React from 'react';
import { Panel, Table, Button, Modal, FormGroup, ControlLabel, Form, Col, FormControl, Tooltip, OverlayTrigger, Tabs, Tab } from 'react-bootstrap';
import Select from 'react-select';
import { CSVReader } from 'react-papaparse';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';
import GenericAdminModal from 'src/apps/admin/generic/GenericAdminModal';

const loadUserByName = (input) => {
  if (!input) {
    return Promise.resolve({ options: [] });
  }

  return AdminFetcher.fetchUsersByNameType(input, 'Person')
    .then((res) => selectUserOptionFormater({ data: res }))
    .catch((errorMessage) => {
      console.log(errorMessage);
    });
};

const handleResetPassword = (id, random) => {
  AdminFetcher.resetUserPassword({ user_id: id, random })
    .then((result) => {
      if (result.rp) {
        let message = '';
        if (random) {
          message = result.pwd ? `Password reset! New password: \n ${result.pwd}`
            : 'Password reset!';
        } else {
          message = result.email ? `Password reset! instructions sent to : \n ${result.email}`
            : 'Password instruction sent!';
        }
        alert(message);
      } else {
        alert(`Password reset fail: \n ${result.pwd}`);
      }
    });
};

const validateEmail = mail => (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail));
const editTooltip = <Tooltip id="inchi_tooltip">edit User Info</Tooltip>;
const resetPasswordTooltip = <Tooltip id="assign_button">reset password</Tooltip>;
const resetPasswordInstructionsTooltip = <Tooltip id="assign_button">send password instructions</Tooltip>;
const confirmUserTooltip = <Tooltip id="assign_button">confirm this account</Tooltip>;
const confirmEmailChangeTooltip = email => (<Tooltip id="email_change_button">confirm email: <br /> {email}</Tooltip>);
const disableTooltip = <Tooltip id="assign_button">lock this account</Tooltip>;
const enableTooltip = <Tooltip id="assign_button">unlock this account</Tooltip>;
const converterEnableTooltip = <Tooltip id="assign_button">Enable Converter profiles editing for this user (currently disabled)</Tooltip>;
const converterDisableTooltip = <Tooltip id="assign_button">Disable Converter profiles editing for this user (currently enabled)</Tooltip>;
const templateModeratorEnableTooltip = <Tooltip id="assign_button">Enable Ketcher template editing for this user (currently disabled)</Tooltip>;
const templateModeratorDisableTooltip = <Tooltip id="assign_button">Disable Ketcher template editing for this user (currently enabled)</Tooltip>;
const moleculeModeratorEnableTooltip = <Tooltip id="assign_button">Enable editing the representation of the global molecules for this user (currently disabled)</Tooltip>;
const moleculeModeratorDisableTooltip = <Tooltip id="assign_button">Disable editing the representation of the global molecules for this user (currently enabled)</Tooltip>;
const accountActiveTooltip = <Tooltip id="assign_button">This user account is deactivated, press button to [activate]</Tooltip>;
const accountInActiveTooltip = <Tooltip id="assign_button">This user account is activated, press button to [deactivate]</Tooltip>;

export default class UserManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      user: {},
      selectedUsers: null,
      showMsgModal: false,
      showNewUserModal: false,
      showEditUserModal: false,
      showGenericAdminModal: false,
      messageNewUserModal: '',
      messageEditUserModal: '',
      processingSummaryUserFile: '',
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
    this.handleGenericAdminModal = this.handleGenericAdminModal.bind(this);
    this.handleGenericAdminModalCb = this.handleGenericAdminModalCb.bind(this);
  }

  componentDidMount() {
    this.handleFetchUsers();
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
      showNewUserModal: true
    });
  }

  handleNewUserClose() {
    this.setState({
      showNewUserModal: false
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

  handleGenericAdminModalCb(user) {
    AdminFetcher.fetchUsers()
      .then((result) => {
        let updated = result.users.find(u => u.id === user.id);
        updated = updated || user;
        this.setState({
          users: result.users, user: updated
        });
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
    AdminFetcher.updateAccount({ user_id: id, enable: lockedAt !== null })
      .then((result) => {
        this.handleFetchUsers();
        const message = lockedAt !== null ? 'Account unlocked!' : 'Account locked!'; //
        alert(message);
      });
  }

  handleConverterAdmin(id, isConverterAdmin) {
    AdminFetcher.updateAccount({ user_id: id, converter_admin: !isConverterAdmin })
      .then((result) => {
        this.handleFetchUsers();
        const message = isConverterAdmin === true ? 'Disable Converter profiles editing for this user' : 'Enable Converter profiles editing for this user';
        alert(message);
      });
  }

  handleTemplatesModerator(id, isTemplatesModerator) {
    AdminFetcher.updateAccount({ user_id: id, is_templates_moderator: !isTemplatesModerator })
      .then((result) => {
        this.handleFetchUsers();
        const message = isTemplatesModerator === true ? 'Disable Ketcher template editing for this user' : 'Enable Ketcher template editing for this user';
        alert(message);
      });
  }

  handleMoleculesModerator(id, isMoleculesEditor) {
    AdminFetcher.updateAccount({ user_id: id, molecule_editor: !isMoleculesEditor })
      .then((result) => {
        this.handleFetchUsers();
        const message = isMoleculesEditor === true ? 'Disable editing the representation of the global molecules for this user' : 'Enable editing the representation of the global molecules for this user';
        alert(message);
      });
  }

  handleActiveInActiveAccount(id, isActive) {
    AdminFetcher.updateAccount({ user_id: id, account_active: !isActive })
      .then((result) => {
        this.handleFetchUsers();
        const message = isActive === true ? 'User is In-Active!' : 'User is Active now!';
        alert(message);
      });
  }

  handleSelectUser(val) {
    if (val) {
      this.setState({ selectedUsers: val });
    }
  }

  handleConfirmUserAccount(id) {
    AdminFetcher.updateAccount({ user_id: id, confirm_user: true })
      .then((result) => {
        if (result !== null) {
          this.handleFetchUsers();
          alert('User Account has been confirmed!');
        }
      });
  }

  handleReConfirmUserAccount(id) {
    AdminFetcher.updateAccount({ user_id: id, reconfirm_user: true })
      .then((result) => {
        if (result !== null) {
          this.handleFetchUsers();
          alert('User New Email has been confirmed!');
        }
      });
  }

  validateUserInput() {
    if (this.email.value === '') { // also validated in backend
      this.setState({ messageNewUserModal: 'Please input email.' });
      return false;
    } else if (!validateEmail(this.email.value.trim())) { // also validated in backend
      this.setState({ messageNewUserModal: 'You have entered an invalid email address!' });
      return false;
    } else if (this.password.value.trim() === '' || this.passwordConfirm.value.trim() === '') {
      this.setState({ messageNewUserModal: 'Please input password with correct format.' });
      return false;
    } else if (this.password.value.trim() !== this.passwordConfirm.value.trim()) {
      this.setState({ messageNewUserModal: 'passwords do not mach!' });
      return false;
    } else if (this.password.value.trim().length < 8) { // also validated in backend
      this.setState({ messageNewUserModal: 'Password is too short (minimum is 8 characters)' });
      return false;
    } else if (this.firstname.value.trim() === '' || this.lastname.value.trim() === '' || this.nameAbbr.value.trim() === '') { // also validated in backend
      this.setState({ messageNewUserModal: 'Please input First name, Last name and Name abbreviation' });
      return false;
    }
    return true;
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
    if (!validFileTypes.includes(file.type)) { // Note that MIME type doesn't reliably indicate file type. It's only an initial guard and data is validated more thoroughly during processing.
      this.setState({ processingSummaryUserFile: `Invalid file type ${file.type}. Please make sure to upload a CSV file.` });
      this.newUsers = null;
      return false;
    }
    this.newUsers = data;
    for (let i = 0; i < this.newUsers.length; i++) {
      this.newUsers[i].data.row = i + 1;
    }
  };

  handleOnErrorUserFile = (err, file, inputElem, reason) => {
    console.log(err);
    this.newUsers = null;
  };

  handleOnRemoveUserFile = (data) => {
    this.newUsers = null;
  };

  handleCreateNewUsersFromFile() {
    if (!this.validUserFile()) {
      this.newUsers = null;
      this.setState({ messageNewUserModal: 'Finished processing user file.' });
    } else {
      const promisedNewUsers = this.newUsers.map(user => this.createNewUserFromFile(user));
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
      this.setState({ processingSummaryUserFile: `The file contains too many users. Please make sure that the number of users you add from a single file doesn't exceed ${nUsersMax}.` });
      return false;
    }

    const fileHeader = this.newUsers[0].meta.fields;
    const validHeader = ['email', 'password', 'firstname', 'lastname', 'nameabbr', 'type'];
    if (!(fileHeader.length === validHeader.length &&
      fileHeader.every((val, index) => val === validHeader[index]))) {
      this.setState({ processingSummaryUserFile: `The file contains an invalid header ${fileHeader}. Please make sure that your file's header is organized as follows: ${validHeader}.` });
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
    const validTypes = ['Person', 'Device', 'Admin'];
    let invalidTypeMessage = '';
    this.newUsers.forEach((user) => {
      const userType = user.data.type.trim();
      if (!validTypes.includes(userType)) {
        invalidTypeMessage += `Row ${user.data.row}: The user's type "${userType}" is invalid. Please select a valid type from ${validTypes}.\n\n`;
      }
    });
    if (!(invalidTypeMessage === '')) {
      this.setState({ processingSummaryUserFile: invalidTypeMessage });
      return false;
    }

    const sortedUserEmails = this.newUsers.map(user => user.data.email).sort();
    const duplicateUserEmails = new Set();
    for (let i = 0; i < sortedUserEmails.length - 1; i++) {
      if (sortedUserEmails[i + 1] == sortedUserEmails[i]) {
        duplicateUserEmails.add(sortedUserEmails[i]);
      }
    }
    if (duplicateUserEmails.size) {
      this.setState({ processingSummaryUserFile: `The file contains duplicate user emails: ${Array.from(duplicateUserEmails.values())}. Please make sure that each user has a unique email.` });
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

  handleUpdateUser(user) {
    if (!validateEmail(this.u_email.value.trim())) {
      this.setState({ messageEditUserModal: 'You have entered an invalid email address!' });
      return false;
    } else if (this.u_firstname.value.trim() === '' || this.u_lastname.value.trim() === '' || this.u_abbr.value.trim() === '') {
      this.setState({ messageEditUserModal: 'please input first name, last name and name abbreviation!' });
      return false;
    }
    AdminFetcher.updateUser({
      id: user.id,
      email: this.u_email.value.trim(),
      first_name: this.u_firstname.value.trim(),
      last_name: this.u_lastname.value.trim(),
      name_abbreviation: this.u_abbr.value.trim(),
      type: this.u_type.value
    })
      .then((result) => {
        if (result.error) {
          this.setState({ messageEditUserModal: result.error });
          return false;
        }
        this.setState({ showEditUserModal: false, messageEditUserModal: '' });
        this.u_email.value = '';
        this.u_firstname.value = '';
        this.u_lastname.value = '';
        this.u_abbr.value = '';
        this.handleFetchUsers();
        return true;
      });
    return true;
  }
  messageSend() {
    const { selectedUsers } = this.state;
    if (this.myMessage.value === '') {
      alert('Please input the message!');
    } else if (!selectedUsers) {
      alert('Please select user(s)!');
    } else {
      const userIds = [];
      selectedUsers.map((g) => {
        userIds.push(g.value);
        return true;
      });
      MessagesFetcher.channelIndividualUsers()
        .then((result) => {
          const params = {
            channel_id: result.id,
            content: this.myMessage.value,
            user_ids: userIds
          };
          MessagesFetcher.createMessage(params)
            .then((result) => {
              this.myMessage.value = '';
              this.setState({
                selectedUsers: null
              });
              this.handleMsgClose();
            });
        });
    }
  }

  renderMessageModal() {
    const { selectedUsers } = this.state;
    return (
      <Modal
        show={this.state.showMsgModal}
        onHide={this.handleMsgClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Send Message</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
            <Form>
              <FormGroup controlId="formControlsTextarea">
                <ControlLabel>Message</ControlLabel>
                <FormControl
                  componentClass="textarea"
                  placeholder="message..."
                  rows="20"
                  inputRef={(ref) => { this.myMessage = ref; }}
                />
              </FormGroup>
              <FormGroup>
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
                  loadOptions={loadUserByName}
                  onChange={this.handleSelectUser}
                />
              </FormGroup>
              <Button
                bsStyle="primary"
                onClick={() => this.messageSend()}
              >
                Send&nbsp;
                <i className="fa fa-paper-plane" />
              </Button>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderNewUserModal() {
    // const { selectedUsers } = this.state;
    return (
      <Modal
        show={this.state.showNewUserModal}
        onHide={this.handleNewUserClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs id="createUserTabs">
            <Tab eventKey="singleUser" title="Single user">
              <Form horizontal>
                <FormGroup controlId="formControlEmail">
                  <Col componentClass={ControlLabel} sm={3}>
                    Email:
                  </Col>
                  <Col sm={9}>
                    <FormControl type="email" name="email" inputRef={(ref) => { this.email = ref; }} />
                  </Col>
                </FormGroup>
                <FormGroup controlId="formControlPassword">
                  <Col componentClass={ControlLabel} sm={3}>
                    Password:
                  </Col>
                  <Col sm={9}>
                    <FormControl type="password" name="password" inputRef={(ref) => { this.password = ref; }} />
                  </Col>
                </FormGroup>
                <FormGroup controlId="formControlPasswordConfirmation">
                  <Col componentClass={ControlLabel} sm={3}>
                    Password Confirmation:
                  </Col>
                  <Col sm={9}>
                    <FormControl type="password" inputRef={(ref) => { this.passwordConfirm = ref; }} />
                  </Col>
                </FormGroup>
                <FormGroup controlId="formControlFirstName">
                  <Col componentClass={ControlLabel} sm={3}>
                    First name:
                  </Col>
                  <Col sm={9}>
                    <FormControl type="text" name="firstname" inputRef={(ref) => { this.firstname = ref; }} />
                  </Col>
                </FormGroup>
                <FormGroup controlId="formControlLastName">
                  <Col componentClass={ControlLabel} sm={3}>
                    Last name:
                  </Col>
                  <Col sm={9}>
                    <FormControl type="text" name="lastname" inputRef={(ref) => { this.lastname = ref; }} />
                  </Col>
                </FormGroup>
                <FormGroup controlId="formControlAbbr">
                  <Col componentClass={ControlLabel} sm={3}>
                    Abbr (3) *:
                  </Col>
                  <Col sm={9}>
                    <FormControl type="text" name="nameAbbr" inputRef={(ref) => { this.nameAbbr = ref; }} />
                  </Col>
                </FormGroup>
                <FormGroup controlId="formControlsType">
                  <Col componentClass={ControlLabel} sm={3}>
                    Type:
                  </Col>
                  <Col sm={9}>
                    <FormControl componentClass="select" inputRef={(ref) => { this.type = ref; }} >
                      <option value="Person">Person</option>
                      <option value="Admin">Admin</option>
                      <option value="Device">Device</option>
                    </FormControl>
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col smOffset={0} sm={10}>
                    <Button bsStyle="primary" onClick={() => this.handleCreateNewUser()} >
                      Create user&nbsp;
                      <i className="fa fa-plus" />
                    </Button>
                  </Col>
                </FormGroup>
              </Form>
            </Tab>
            <Tab eventKey="multiUser" title="Multiple users from file">
              <Form>
                <FormGroup>
                  <ControlLabel>Please format the user file like the table below.</ControlLabel>
                  <Table striped bordered hover>
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
                </FormGroup>
                <FormGroup id="userFileDragAndDrop">
                  <CSVReader
                    onDrop={this.handleOnDropUserFile}
                    onError={this.handleOnErrorUserFile}
                    style={{}}
                    config={{ header: true, skipEmptyLines: true }}
                    addRemoveButton
                    onRemoveFile={this.handleOnRemoveUserFile}
                  >
                    <span>Drop a CSV user file here or click to upload.
                      The following column-delimiters are accepted: &apos;,&apos; or &apos;;&apos; or &apos;tab&apos;.
                    </span>
                  </CSVReader>
                </FormGroup>
                <FormGroup>
                  <Button bsStyle="primary" onClick={() => this.handleCreateNewUsersFromFile()} >
                    Create users&nbsp;
                    <i className="fa fa-plus" />
                  </Button>
                </FormGroup>
                <FormGroup>
                  <ControlLabel>Processing Summary</ControlLabel>
                  <FormControl
                    readOnly
                    id="processingSummary"
                    componentClass="textarea"
                    rows="5"
                    style={{ whiteSpace: 'pre-wrap', overflowY: 'scroll' }}
                    value={this.state.processingSummaryUserFile}
                  />
                </FormGroup>
              </Form>
            </Tab>
          </Tabs>
          <Modal.Footer>
            <FormGroup controlId="formControlMessage">
              <FormControl type="text" readOnly name="messageNewUserModal" value={this.state.messageNewUserModal} />
            </FormGroup>
            <Button bsStyle="warning" onClick={() => this.handleNewUserClose()} >Cancel</Button>
          </Modal.Footer>
        </Modal.Body>
      </Modal>
    );
  }


  renderEditUserModal() {
    const { user } = this.state;
    return (
      <Modal
        show={this.state.showEditUserModal}
        onHide={this.handleEditUserClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
            <Form horizontal>
              <FormGroup controlId="formControlEmail">
                <Col componentClass={ControlLabel} sm={3}>
                  Email:
                </Col>
                <Col sm={9}>
                  <FormControl type="email" name="u_email" defaultValue={user.email} inputRef={(ref) => { this.u_email = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlFirstName">
                <Col componentClass={ControlLabel} sm={3}>
                  First name:
                </Col>
                <Col sm={9}>
                  <FormControl type="text" name="u_firstname" defaultValue={user.first_name} inputRef={(ref) => { this.u_firstname = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlLastName">
                <Col componentClass={ControlLabel} sm={3}>
                  Last name:
                </Col>
                <Col sm={9}>
                  <FormControl type="text" name="u_lastname" defaultValue={user.last_name} inputRef={(ref) => { this.u_lastname = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlAbbr">
                <Col componentClass={ControlLabel} sm={3}>
                  Abbr (3):
                </Col>
                <Col sm={9}>
                  <FormControl type="text" name="u_abbr" defaultValue={user.initials} inputRef={(ref) => { this.u_abbr = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlsType">
                <Col componentClass={ControlLabel} sm={3}>
                  Type:
                </Col>
                <Col sm={9}>
                  <FormControl componentClass="select" defaultValue={user.type} inputRef={(ref) => { this.u_type = ref; }} >
                    <option value="Person">Person</option>
                    <option value="Group">Group</option>
                    <option value="Device">Device</option>
                    <option value="Admin">Admin</option>
                  </FormControl>
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlMessage">
                <Col sm={12}>
                  <FormControl type="text" readOnly name="messageEditUserModal" value={this.state.messageEditUserModal} />
                </Col>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="primary" onClick={() => this.handleUpdateUser(user)} >
                    Update&nbsp;
                    <i className="fa fa-save" />
                  </Button>
                  &nbsp;
                  <Button bsStyle="warning" onClick={() => this.handleEditUserClose()} >
                    Cancel&nbsp;
                  </Button>
                </Col>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderGenericAdminModal() {
    const { user, showGenericAdminModal } = this.state;
    if (showGenericAdminModal) {
      return (<GenericAdminModal
        user={user}
        fnShowModal={this.handleGenericAdminModal}
        fnCb={this.handleGenericAdminModalCb}
      />);
    }
    return null;
  }

  render() {
    const renderConfirmButton = (show, userId) => {
      if (show) {
        return (
          <OverlayTrigger placement="bottom" overlay={confirmUserTooltip}>
            <Button
              bsSize="xsmall"
              bsStyle="info"
              onClick={() => this.handleConfirmUserAccount(userId, false)}
            >
              <i className="fa fa-check-square" />
            </Button>
          </OverlayTrigger>
        );
      }
      return <span />;
    };

    const renderReConfirmButton = (unconfirmed_email, userId) => {
      if (unconfirmed_email) {
        return (
          <OverlayTrigger placement="bottom" overlay={confirmEmailChangeTooltip(unconfirmed_email)}>
            <Button
              bsSize="xsmall"
              bsStyle="warning"
              onClick={() => this.handleReConfirmUserAccount(userId)}
            >
              <i className="fa fa-check-square" />
            </Button>
          </OverlayTrigger>
        );
      }
      return <span />;
    };

    const { users } = this.state;

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="1%">#</th>
        <th width="12%">Actions</th>
        <th width="12%">Name</th>
        <th width="6%">Abbr.</th>
        <th width="8%">Email</th>
        <th width="7%">Type</th>
        <th width="15%">Login at</th>
        <th width="2%">ID</th>
      </tr>
    );

    const tbody = users.map((g, idx) => (
      <tr key={`row_${g.id}`} style={{ height: '26px', verticalAlign: 'middle' }}>
        <td width="1%">
          {idx + 1}
        </td>
        <td width="12%">
          <OverlayTrigger placement="bottom" overlay={editTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle="info"
              onClick={() => this.handleEditUserShow(g)}
            >
              <i className="fa fa-user" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={resetPasswordTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle="success"
              onClick={() => handleResetPassword(g.id, true)}
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={resetPasswordInstructionsTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle="primary"
              onClick={() => handleResetPassword(g.id, false)}
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={g.locked_at === null ? disableTooltip : enableTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle={g.locked_at === null ? 'default' : 'warning'}
              onClick={() => this.handleEnableDisableAccount(g.id, g.locked_at, false)}
            >
              <i className={g.locked_at === null ? 'fa fa-lock' : 'fa fa-unlock'} />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={(g.converter_admin === null || g.converter_admin === false) ? converterEnableTooltip : converterDisableTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle={(g.converter_admin === null || g.converter_admin === false) ? 'default' : 'success'}
              onClick={() => this.handleConverterAdmin(g.id, g.converter_admin, false)}
            >
              <i className="fa fa-hourglass-half" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={(g.is_templates_moderator === null || g.is_templates_moderator === false) ? templateModeratorEnableTooltip : templateModeratorDisableTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle={(g.is_templates_moderator === null || g.is_templates_moderator === false) ? 'default' : 'success'}
              onClick={() => this.handleTemplatesModerator(g.id, g.is_templates_moderator, false)}
            >
              <i className="fa fa-book" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={(g.molecule_editor == null || g.molecule_editor === false) ? moleculeModeratorEnableTooltip : moleculeModeratorDisableTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle={(g.molecule_editor === null || g.molecule_editor === false) ? 'default' : 'success'}
              onClick={() => this.handleMoleculesModerator(g.id, g.molecule_editor, false)}
            >
              <i className="icon-sample" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="generic_tooltip">Grant/Revoke Generic Designer</Tooltip>} >
            <Button
              bsSize="xsmall"
              bsStyle={(g.generic_admin?.elements || g.generic_admin?.segments || g.generic_admin?.datasets) ? 'success' : 'default'}
              onClick={() => this.handleGenericAdminModal(true, g)}
            >
              <i className="fa fa-empire" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={!g.account_active ? accountActiveTooltip : accountInActiveTooltip}>
            <Button
              bsSize="xsmall"
              bsStyle={g.account_active === true ? 'default' : 'danger'}
              onClick={() => this.handleActiveInActiveAccount(g.id, g.account_active)}
            >
              <i className={g.account_active === true ? 'fa fa-user-circle' : 'fa fa-user-times'} aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          {renderConfirmButton(g.type !== 'Device' && (g.confirmed_at == null || g.confirmed_at.length <= 0), g.id)}
          {renderReConfirmButton(g.unconfirmed_email, g.id)}
        </td>
        <td width="12%"> {g.name} </td>
        <td width="6%"> {g.initials} </td>
        <td width="8%"> {g.email} </td>
        <td width="7%"> {g.type} </td>
        <td width="15%"> {g.current_sign_in_at} </td>
        <td width="2%"> {g.id} </td>
      </tr>
    ));

    return (
      <div>
        <Panel>
          <Button bsStyle="warning" bsSize="small" onClick={() => this.handleMsgShow()}>
            Send Message&nbsp;<i className="fa fa-commenting-o" />
          </Button>
          &nbsp;
          <Button bsStyle="primary" bsSize="small" onClick={() => this.handleNewUserShow()} data-cy="create-user">
            New User&nbsp;<i className="fa fa-plus" />
          </Button>
        </Panel>
        <Panel>
          <Table>
            <thead>
              {tcolumn}
            </thead>
            <tbody>
              {tbody}
            </tbody>
          </Table>
        </Panel>
        {this.renderMessageModal()}
        {this.renderNewUserModal()}
        {this.renderEditUserModal()}
        { this.renderGenericAdminModal() }
      </div>
    );
  }
}
