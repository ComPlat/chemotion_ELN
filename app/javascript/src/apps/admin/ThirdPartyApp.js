import React from 'react';
import PropTypes from 'prop-types';
import {
  Table, Button, Form, Tooltip, OverlayTrigger, ButtonToolbar
} from 'react-bootstrap';
import { FormattedMessage, injectIntl } from 'react-intl';
import AppModal from 'src/components/common/AppModal';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';

const editTip = (
  <Tooltip id="edit_tpa_tooltip">
    <FormattedMessage id="third_party_app-edit_tooltip" />
  </Tooltip>
);
const deleteTip = (
  <Tooltip id="delete_tpa_tooltip">
    <FormattedMessage id="third_party_app-delete_tooltip" />
  </Tooltip>
);

class ThirdPartyApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showMsgModal: false,
      showMsgModalEdit: false,
      showMsgModalDelete: false,
      messageNewThirdPartyAppModal: '',
      thirdPartyApps: [],
      errorMessage: '',
      currentName: '',
      currentIP: '',
      currentFileTypes: '',
      currentID: ''
    };
    this.closeNewThirdPartyAppModal = this.closeNewThirdPartyAppModal.bind(this);
    this.closeEditThirdPartyAppModal = this.closeEditThirdPartyAppModal.bind(this);
    this.closeDeleteThirdPartyAppModal = this.closeDeleteThirdPartyAppModal.bind(this);
  }

  componentDidMount() {
    this.thirdPartyApps();
  }

  thirdPartyApps() {
    ThirdPartyAppFetcher.fetchThirdPartyApps()
      .then((result) => {
        this.setState({
          thirdPartyApps: result
        });
      });
  }

  newApp(name, url, fileTypes) {
    ThirdPartyAppFetcher.createOrUpdateThirdPartyApp(null, name, url, fileTypes)
      .then((result) => {
        if (result.error) {
          this.setState({ messageNewThirdPartyAppModal: result.error });
          return false;
        }
        this.thirdPartyApps();
        return true;
      });
    return true;
  }

  edit(name, url, fileTypes) {
    const { currentID } = this.state;
    return ThirdPartyAppFetcher.createOrUpdateThirdPartyApp(
      currentID,
      name,
      url,
      fileTypes
    )
      .then((result) => {
        if (result.error) {
          return this.thirdPartyApps().then((res) => {
            res.messageNewThirdPartyAppModal = result.error;
            this.setState(res);
            return false;
          });
        }
        return true;
      });
  }

  delete(id) {
    ThirdPartyAppFetcher.deleteThirdPartyApp(
      id
    )
      .then((result) => {
        if (result.error) {
          this.setState({ messageNewThirdPartyAppModal: result.error });
          return false;
        }
        this.thirdPartyApps();
        return true;
      });
    this.setState({
      showMsgModalDelete: false
    });
    return true;
  }

  showNewThirdPartyAppModal() {
    this.setState({
      showMsgModal: true,
      showMsgModalEdit: false,
    });
  }

  showEditThirdPartyAppModal(key) {
    const { thirdPartyApps } = this.state;
    // select app by key from thirdPartyApps
    const app = thirdPartyApps.find((tpa) => tpa.id === key);
    this.setState({
      showMsgModalEdit: true,
      showMsgModal: false,
      currentName: app?.name,
      currentIP: app?.url,
      currentFileTypes: app?.fileTypes,
      currentID: key
    });
  }

  showDeleteThirdPartyAppModal(key) {
    this.setState({
      showMsgModalDelete: true,
      currentID: key
    });
  }

  closeNewThirdPartyAppModal() {
    this.setState({
      showMsgModal: false,
      errorMessage: null,
    });
  }

  closeEditThirdPartyAppModal() {
    this.setState({
      showMsgModalEdit: false
    });
  }

  closeDeleteThirdPartyAppModal() {
    this.setState({
      showMsgModalDelete: false
    });
  }

  checkInput(name, ip, fileTypes) {
    const { thirdPartyApps, currentID } = this.state;
    let appId = 0;
    if (name.length < 1) {
      this.setState({
        errorMessage: { id: 'third_party_app-error_name_short' }
      });
      return false;
    }

    if (fileTypes.length === 0) {
      this.setState({
        errorMessage: { id: 'third_party_app-error_file_empty' }
      });
      return false;
    }

    if ((ip.slice(0, 7) !== 'http://')
      && (ip.slice(0, 8) !== 'https://')) {
      this.setState({
        errorMessage: { id: 'third_party_app-error_url_invalid' }
      });
      return false;
    }
    // check if name is already used
    if (thirdPartyApps.find((tpa) => { appId = tpa.id; return currentID !== tpa.id && tpa.name === name; })) {
      this.setState({
        errorMessage: { id: 'third_party_app-error_name_used', values: { appId } }
      });
      return false;
    }
    // check if url is already used
    if (thirdPartyApps.find((tpa) => { appId = tpa.id; return currentID !== tpa.id && tpa.url === ip; })) {
      this.setState({
        errorMessage: { id: 'third_party_app-error_url_used', values: { appId } }
      });
      return false;
    }
    return true;
  }

  renderDeleteThirdPartyAppModal() {
    const { showMsgModalDelete, currentName, currentID } = this.state;
    const { intl } = this.props;
    return (
      <AppModal
        show={showMsgModalDelete}
        onHide={this.closeDeleteThirdPartyAppModal}
        title={<FormattedMessage id="third_party_app-delete_title" />}
        primaryActionLabel={intl.formatMessage({ id: 'delete' })}
        onPrimaryAction={() => this.delete(currentID)}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <p>
          <strong>
            <FormattedMessage id="third_party_app-delete_confirm" values={{ name: currentName }} />
          </strong>
        </p>
      </AppModal>
    );
  }

  renderEditThirdPartyAppModal() {
    const {
      showMsgModalEdit,
      errorMessage,
      currentName,
      currentIP,
      currentFileTypes,
    } = this.state;
    const { intl } = this.props;

    let nameRef = null;
    let urlRef = null;
    let fileTypesRef = null;

    const handleEdit = () => {
      const url = urlRef.value?.trim();
      const name = nameRef.value?.trim();
      const fileTypes = fileTypesRef.value?.trim();

      if (this.checkInput(name, url, fileTypes)) {
        this.edit(name, url, fileTypes)
          .then(() => {
            this.closeEditThirdPartyAppModal();
            this.thirdPartyApps();
          })
          .catch(() => { });
      }
    };

    const handleNameChange = (event) => {
      const { errorMessage: currentErrorMessage } = this.state;
      const newState = { currentName: event.target.value };
      if (currentErrorMessage?.id?.startsWith('third_party_app-error_name')) {
        newState.errorMessage = '';
      }
      this.setState(newState);
    };

    const handleIPChange = (event) => {
      const { errorMessage: currentErrorMessage } = this.state;
      const newState = { currentIP: event.target.value };
      if (currentErrorMessage?.id?.startsWith('third_party_app-error_url')) {
        newState.errorMessage = '';
      }
      this.setState(newState);
    };

    const handleFileTypesChange = (event) => {
      const { errorMessage: currentErrorMessage } = this.state;
      const newFileTypes = event.target.value;
      const newState = { currentFileTypes: newFileTypes };
      if (currentErrorMessage?.id?.startsWith('third_party_app-error_file')) {
        newState.errorMessage = '';
      }
      this.setState(newState);
    };

    return (
      <AppModal
        show={showMsgModalEdit}
        onHide={this.closeEditThirdPartyAppModal}
        title={<FormattedMessage id="third_party_app-edit_title" />}
        primaryActionLabel={intl.formatMessage({ id: 'update' })}
        onPrimaryAction={handleEdit}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <Form.Group controlId="formControlName" className="mb-2">
          <Form.Label>
            {`${intl.formatMessage({ id: 'name' })}:`}
          </Form.Label>
          <Form.Control
            type="text"
            name="Name"
            value={currentName}
            onChange={handleNameChange}
            ref={(ref) => { nameRef = ref; }}
          />
        </Form.Group>

        <Form.Group controlId="formControlIPAdress" className="mb-2">
          <Form.Label>
            {`${intl.formatMessage({ id: 'third_party_app-ip_address' })}:`}
          </Form.Label>
          <Form.Control
            type="text"
            name="IP address"
            value={currentIP}
            onChange={handleIPChange}
            ref={(ref) => { urlRef = ref; }}
          />
        </Form.Group>

        <Form.Group controlId="formControlFileType" className="mb-2">
          <Form.Label>
            {`${intl.formatMessage({ id: 'third_party_app-compatible_file_types_mime' })}:`}
          </Form.Label>
          <Form.Control
            type="text"
            name="Mime types list"
            value={currentFileTypes}
            onChange={handleFileTypesChange}
            ref={(ref) => { fileTypesRef = ref; }}
            placeholder={intl.formatMessage({ id: 'third_party_app-file_types_placeholder' })}
          />
        </Form.Group>

        {errorMessage && (
          <Form.Group controlId="formControlEditMessage">
            <Form.Control
              type="text"
              readOnly
              name="messageNewUserModal"
              value={intl.formatMessage({ id: errorMessage.id }, errorMessage.values)}
            />
          </Form.Group>
        )}
      </AppModal>
    );
  }

  renderNewThirdPartyAppModal() {
    const { showMsgModal, errorMessage } = this.state;
    const { intl } = this.props;

    let nameRef = null;
    let urlRef = null;
    let fileTypesRef = null;

    const handleCreate = () => {
      const url = urlRef.value;
      const name = nameRef.value;
      const fileTypes = fileTypesRef.value.trim();
      if (this.checkInput(name, url, fileTypes)) {
        this.newApp(name, url, fileTypes);
        this.closeNewThirdPartyAppModal();
      }
    };

    return (
      <AppModal
        show={showMsgModal}
        onHide={this.closeNewThirdPartyAppModal}
        title={<FormattedMessage id="third_party_app-new_title" />}
        primaryActionLabel={intl.formatMessage({ id: 'create' })}
        onPrimaryAction={handleCreate}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <Form.Group controlId="formControlName" className="mb-2">
          <Form.Label>
            {`${intl.formatMessage({ id: 'name' })}:`}
          </Form.Label>
          <Form.Control type="text" name="Name" ref={(ref) => { nameRef = ref; }} />
        </Form.Group>

        <Form.Group controlId="formControlIPAdress" className="mb-2">
          <Form.Label>
            {`${intl.formatMessage({ id: 'third_party_app-ip_address' })}:`}
          </Form.Label>
          <Form.Control type="text" name="IP address" ref={(ref) => { urlRef = ref; }} />
        </Form.Group>

        <Form.Group controlId="formControlFileTypes" className="mb-2">
          <Form.Label>
            {`${intl.formatMessage({ id: 'third_party_app-file_types_mime' })}:`}
          </Form.Label>
          <Form.Control
            type="text"
            name="File types"
            ref={(ref) => { fileTypesRef = ref; }}
            placeholder={intl.formatMessage({ id: 'third_party_app-file_types_placeholder' })}
          />
        </Form.Group>

        {errorMessage && (
          <Form.Group controlId="formControlCreateMessage">
            <Form.Control
              type="text"
              readOnly
              name="messageNewUserModal"
              value={intl.formatMessage({ id: errorMessage.id }, errorMessage.values)}
            />
          </Form.Group>
        )}
      </AppModal>
    );
  }

  render() {
    const { thirdPartyApps, messageNewThirdPartyAppModal } = this.state;

    return (
      <div>
        <Button variant="primary" size="sm" onClick={() => this.showNewThirdPartyAppModal()}>
          <FormattedMessage id="third_party_app-new_btn" />
          <i className="fa fa-plus ms-1" />
        </Button>
        {this.renderNewThirdPartyAppModal()}

        <Table>
          <thead>
            <tr>
              <th><FormattedMessage id="actions" /></th>
              <th><FormattedMessage id="name" /></th>
              <th><FormattedMessage id="third_party_app-ip_address" /></th>
              <th><FormattedMessage id="third_party_app-file_types" /></th>
              <th><FormattedMessage id="id" /></th>
            </tr>
          </thead>
          <tbody>
            {thirdPartyApps.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <ButtonToolbar>
                    <OverlayTrigger placement="bottom" overlay={editTip}>
                      <Button variant="info" size="sm" onClick={() => this.showEditThirdPartyAppModal(entry.id)}>
                        <FormattedMessage id="edit" />
                      </Button>
                    </OverlayTrigger>

                    <OverlayTrigger placement="bottom" overlay={deleteTip}>
                      <Button variant="danger" size="sm" onClick={() => this.showDeleteThirdPartyAppModal(entry.id)}>
                        <i className="fa fa-trash-o" aria-hidden="true" />
                      </Button>
                    </OverlayTrigger>
                  </ButtonToolbar>

                </td>
                <td>{entry.name}</td>
                <td>{entry.url}</td>
                <td>{entry.fileTypes}</td>
                <td>{entry.id}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {this.renderEditThirdPartyAppModal()}
        {this.renderDeleteThirdPartyAppModal()}
        <h2>{messageNewThirdPartyAppModal}</h2>

      </div>
    );
  }
}

ThirdPartyApp.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(ThirdPartyApp);
