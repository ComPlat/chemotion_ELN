import React from 'react';
import { Panel, Table, Button, Modal, FormGroup, ControlLabel, Form, Col, FormControl, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Select from 'react-select';
import UsersFetcher from '../components/fetchers/UsersFetcher';
import AdminFetcher from '../components/fetchers/AdminFetcher';
import MessagesFetcher from '../components/fetchers/MessagesFetcher';

const loadUserByName = (input) => {
  if (!input) {
    return Promise.resolve({ options: [] });
  }

  return UsersFetcher.fetchUsersByName(input)
    .then((res) => {
      const usersEntries = res.users.filter(u => u.user_type === 'Person')
        .map(u => ({
          value: u.id,
          name: u.name,
          label: `${u.name}(${u.abb})`
        }));
      return { options: usersEntries };
    }).catch((errorMessage) => {
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
const disableTooltip = <Tooltip id="assign_button">lock this account</Tooltip>;
const enableTooltip = <Tooltip id="assign_button">unlock this account</Tooltip>;
const templateModeratorEnableTooltip = <Tooltip id="assign_button">Enable Ketcher template editing for this user (currently disabled)</Tooltip>;
const templateModeratorDisableTooltip = <Tooltip id="assign_button">Disable Ketcher template editing for this user (currently enabled)</Tooltip>;
const moleculeModeratorEnableTooltip = <Tooltip id="assign_button">Enable editing the representation of the global molecules for this user (currently disabled)</Tooltip>;
const moleculeModeratorDisableTooltip = <Tooltip id="assign_button">Disable editing the representation of the global molecules for this user (currently enabled)</Tooltip>;

export default class UserManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      user: {},
      selectedUsers: null,
      showMsgModal: false,
      showNewUserModal: false,
      createUserMessage: '',
      editUserMessage: '',
      showEditUserModal: false
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
      editUserMessage: '',
      user
    });
  }

  handleEditUserClose() {
    this.setState({
      showEditUserModal: false,
      editUserMessage: '',
      user: {}
    });
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
        const message = lockedAt !== null ? 'Account unloacked!' : 'Account locked!'
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
          alert('User Account Confirmed!');
        }
      });
  }

  validateUserInput() {
    if (this.email.value === '') {
      this.setState({ createUserMessage: 'Please input email.' });
      return false;
    } else if (!validateEmail(this.email.value.trim())) {
      this.setState({ createUserMessage: 'You have entered an invalid email address!' });
      return false;
    } else if (this.password.value.trim() === '' || this.passwordConfirm.value.trim() === '') {
      this.setState({ createUserMessage: 'Please input password with correct format.' });
      return false;
    } else if (this.password.value.trim() !== this.passwordConfirm.value.trim()) {
      this.setState({ createUserMessage: 'passwords do not mach!' });
      return false;
    } else if (this.password.value.trim().length < 2) {
      this.setState({ createUserMessage: 'Password is too short (minimum is 8 characters)' });
      return false;
    } else if (this.firstname.value.trim() === '' || this.lastname.value.trim() === '' || this.nameAbbr.value.trim() === '') {
      this.setState({ createUserMessage: 'Please input First name, Last name and Name abbreviation' });
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
          this.setState({ createUserMessage: result.error });
          return false;
        }
        this.setState({ createUserMessage: 'New user created.' });
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

  handleUpdateUser(user) {
    if (!validateEmail(this.u_email.value.trim())) {
      this.setState({ editUserMessage: 'You have entered an invalid email address!' });
      return false;
    } else if (this.u_firstname.value.trim() === '' || this.u_lastname.value.trim() === '') {
      this.setState({ editUserMessage: 'please input first name and last name' });
      return false;
    }
    AdminFetcher.updateUser({
      id: user.id,
      email: this.u_email.value.trim(),
      first_name: this.u_firstname.value.trim(),
      last_name: this.u_lastname.value.trim(),
      type: this.u_type.value
    })
      .then((result) => {
        if (result.error) {
          this.setState({ editUserMessage: result.error });
          return false;
        }
        this.setState({ showEditUserModal: false, editUserMessage: '' });
        this.u_email.value = '';
        this.u_firstname.value = '';
        this.u_lastname.value = '';
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
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
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
              <FormGroup controlId="formControlMessage">
                <Col sm={12}>
                  <FormControl type="text" readOnly name="createUserMessage" value={this.state.createUserMessage} />
                </Col>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="primary" onClick={() => this.handleCreateNewUser()} >
                    Create&nbsp;
                    <i className="fa fa-plus" />
                  </Button>
                  &nbsp;
                  <Button bsStyle="warning" onClick={() => this.handleNewUserClose()} >
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


  renderEditUserModal() {
    const { user } = this.state;
    return (
      <Modal
        show={this.state.showEditUserModal}
        onHide={this.handleEditUserClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>New User</Modal.Title>
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
              <FormGroup controlId="formControlsType">
                <Col componentClass={ControlLabel} sm={3}>
                  Type:
                </Col>
                <Col sm={9}>
                  <FormControl componentClass="select" defaultValue={user.type} inputRef={(ref) => { this.u_type = ref; }} >
                    <option value="Person">Person</option>
                    <option value="Admin">Admin</option>
                  </FormControl>
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlMessage">
                <Col sm={12}>
                  <FormControl type="text" readOnly name="editUserMessage" value={this.state.editUserMessage} />
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
        )
      }
      return <div />
    }

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
    )

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
          <OverlayTrigger placement="bottom" overlay={g.is_templates_moderator === false ? templateModeratorEnableTooltip : templateModeratorDisableTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle={g.is_templates_moderator === false ? 'default' : 'success'}
              onClick={() => this.handleTemplatesModerator(g.id, g.is_templates_moderator, false)}
            >
              <i className="fa fa-book" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={g.molecule_editor === false ? moleculeModeratorEnableTooltip : moleculeModeratorDisableTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle={g.molecule_editor === false ? 'default' : 'success'}
              onClick={() => this.handleMoleculesModerator(g.id, g.molecule_editor, false)}
            >
              <i className="icon-sample" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          { renderConfirmButton(g.type !== 'Device' && (g.confirmed_at == null || g.confirmed_at.length <= 0), g.id) }
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
          <Button bsStyle="primary" bsSize="small" onClick={() => this.handleNewUserShow()}>
          New User&nbsp;<i className="fa fa-plus" />
          </Button>
        </Panel>
        <Panel>
          <Table>
            <thead>
              { tcolumn }
            </thead>
            <tbody>
              { tbody }
            </tbody>
          </Table>
        </Panel>
        { this.renderMessageModal() }
        { this.renderNewUserModal() }
        { this.renderEditUserModal() }
      </div>
    );
  }
}
