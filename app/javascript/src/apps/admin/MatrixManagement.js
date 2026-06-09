import React from 'react';
import PropTypes from 'prop-types';
import {
  Table, Button, Form, Tooltip, OverlayTrigger, InputGroup
} from 'react-bootstrap';
import uuid from 'uuid';
import { AsyncSelect } from 'src/components/common/Select';
import JSONInput from 'react-json-editor-ajrm';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { FormattedMessage, injectIntl } from 'react-intl';
import AppModal from 'src/components/common/AppModal';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const editTooltip = (
  <Tooltip id="edit_tooltip"><FormattedMessage id="matrix-edit_permission" /></Tooltip>
);
const jsonTooltip = (
  <Tooltip id="json_tooltip"><FormattedMessage id="matrix-edit_json" /></Tooltip>
);
const Notification = (props) => (
  NotificationActions.add({
    title: props.title,
    message: props.msg,
    level: props.lvl,
    position: 'tc',
    dismissible: 'button',
    uid: uuid.v4()
  })
);

const loadUserByName = (input) => {
  if (!input) {
    return Promise.resolve({ options: [] });
  }
  return AdminFetcher.fetchUsersByNameType(input, 'Person,Group')
    .then((res) => selectUserOptionFormater({ data: res, withType: true }))
    .catch((errorMessage) => {
      console.log(errorMessage);
    });
};

class MatrixManagement extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      matrices: [],
      matrice: {},
      showEditModal: false,
      showJsonModal: false,
      showJsonBtn: false,
      includeUsers: null,
      excludeUsers: null
    };

    this.edit = this.edit.bind(this);
    this.editJson = this.editJson.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleIncludeUser = this.handleIncludeUser.bind(this);
    this.handleExcludeUser = this.handleExcludeUser.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleJsonSave = this.handleJsonSave.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleJsonClose = this.handleJsonClose.bind(this);
    this.onChangeJson = this.onChangeJson.bind(this);
  }

  componentDidMount() {
    this.fetchMatrices();
  }

  handleChange(val) {
    const { matrice } = this.state;
    matrice.enabled = (val === true);
    this.setState({
      matrice
    });
  }

  handleIncludeUser(val) {
    this.setState({ includeUsers: val });
  }

  handleExcludeUser(val) {
    this.setState({ excludeUsers: val });
  }

  handleSave(matrice) {
    const { includeUsers, excludeUsers } = this.state;
    const { intl } = this.props;

    const params = {
      id: matrice.id,
      label: this.m_label.value.trim(),
      enabled: matrice.enabled,
    };

    params.include_ids = (includeUsers ?? []).map((u) => u.value);
    params.exclude_ids = (excludeUsers ?? []).map((u) => u.value);

    const title = intl.formatMessage({ id: 'matrix-function_label' }, { name: matrice.name });

    AdminFetcher.updateMatrice(params)
      .then((result) => {
        if (result.error) {
          Notification({ title, lvl: 'error', msg: result.error });
          return false;
        }
        Notification({
          title,
          lvl: 'info',
          msg: intl.formatMessage({ id: 'matrix-updated_successfully' }),
        });
        this.setState({
          showEditModal: false, includeUsers: null, excludeUsers: null, matrice: {}
        });
        this.m_label.value = '';
        this.fetchMatrices();
        return true;
      });
  }

  handleJsonSave(matrice) {
    const { intl } = this.props;
    const title = intl.formatMessage({ id: 'matrix-function_label' }, { name: matrice.name });

    AdminFetcher.updateMatrice({ id: matrice.id, configs: matrice.configs })
      .then((result) => {
        if (result.error) {
          Notification({ title, lvl: 'error', msg: result.error });
          return false;
        }
        Notification({
          title,
          lvl: 'info',
          msg: intl.formatMessage({ id: 'matrix-json_updated_successfully' }),
        });
        this.setState({ showJsonModal: false, showJsonBtn: false, matrice: {} });
        this.fetchMatrices();
        return true;
      });
  }

  handleClose() {
    this.setState({ showEditModal: false });
  }

  handleJsonClose() {
    this.setState({ showJsonModal: false });
  }

  onChangeJson(e) {
    const { matrice } = this.state;
    if (e.error === false) {
      matrice.configs = e.jsObject;
      this.setState({ matrice, showJsonBtn: true });
    }
  }

  editJson(matrice) {
    this.setState({
      showJsonModal: true, showEditModal: false, matrice
    });
  }

  edit(matrice) {
    this.setState({
      showEditModal: true,
      showJsonModal: false,
      matrice,
      includeUsers: matrice.include_users,
      excludeUsers: matrice.exclude_users,
    });
  }

  fetchMatrices() {
    AdminFetcher.fetchMatrices()
      .then((result) => {
        this.setState({ matrices: result.matrices });
      });
  }

  renderList() {
    const { matrices } = this.state;
    const { intl } = this.props;
    const tbody = matrices && matrices.map((e, idx) => (
      <tbody key={`tbody_${e.id}`}>
        <tr
          key={`row_${e.id}`}
          id={`row_${e.id}`}
        >
          <td>{idx + 1}</td>
          <td>
            <OverlayTrigger placement="bottom" overlay={editTooltip}>
              <Button
                size="sm"
                variant="info"
                onClick={() => this.edit(e)}
                className="me-1"
                aria-label={intl.formatMessage({ id: 'matrix-edit_permission' })}
              >
                <i className="fa fa-pencil-square-o" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger placement="bottom" overlay={jsonTooltip}>
              <Button
                size="sm"
                variant="warning"
                onClick={() => this.editJson(e)}
                className="me-1"
                aria-label={intl.formatMessage({ id: 'matrix-edit_json_configuration' })}
              >
                <i className="fa fa-cog" />
              </Button>
            </OverlayTrigger>
          </td>
          <td>{e.id}</td>
          <td>{e.name}</td>
          <td>{e.label}</td>
          <td><FormattedMessage id={e.enabled === true ? 'yes' : 'no'} /></td>
          <td>{e.include_users.map((u) => u.label).join(', ')}</td>
          <td>{e.exclude_users.map((u) => u.label).join(', ')}</td>
        </tr>
      </tbody>
    ));

    return (
      <div>
        <Table responsive condensed hover className="border">
          <thead>
            <tr className="bg-gray-200">
              <th>#</th>
              <th><FormattedMessage id="actions" /></th>
              <th><FormattedMessage id="id" /></th>
              <th><FormattedMessage id="matrix-function_name" /></th>
              <th><FormattedMessage id="matrix-description" /></th>
              <th><FormattedMessage id="matrix-set_globally" /></th>
              <th><FormattedMessage id="matrix-enabled_for" /></th>
              <th><FormattedMessage id="matrix-disabled_for" /></th>
            </tr>
          </thead>
          {tbody}
        </Table>
      </div>
    );
  }

  renderEditModal() {
    const {
      matrice, includeUsers, excludeUsers, showEditModal
    } = this.state;
    const { intl } = this.props;
    const selectPlaceholder = intl.formatMessage({ id: 'select_placeholder' });

    return (
      <AppModal
        show={showEditModal}
        onHide={this.handleClose}
        title={<FormattedMessage id="matrix-edit_permission" />}
        primaryActionLabel={intl.formatMessage({ id: 'update' })}
        onPrimaryAction={() => this.handleSave(matrice)}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <Form className="row g-3">
          <Form.Group controlId="formControlId">
            <InputGroup>
              <InputGroup.Text><FormattedMessage id="id" /></InputGroup.Text>
              <Form.Control type="text" defaultValue={matrice.id} readOnly />
            </InputGroup>
          </Form.Group>
          <Form.Group controlId="formControlName">
            <InputGroup>
              <InputGroup.Text><FormattedMessage id="matrix-function_name" /></InputGroup.Text>
              <Form.Control type="text" defaultValue={matrice.name} readOnly />
            </InputGroup>
          </Form.Group>
          <Form.Group controlId="formControlLabel">
            <InputGroup>
              <InputGroup.Text><FormattedMessage id="matrix-description" /></InputGroup.Text>
              <Form.Control type="text" defaultValue={matrice.label} ref={(ref) => { this.m_label = ref; }} />
            </InputGroup>
          </Form.Group>
          <Form.Group controlId="formControlLabel">
            <Form.Check
              inline
              type="checkbox"
              checked={matrice.enabled}
              onChange={(e) => this.handleChange(!matrice.enabled, e)}
              label={<FormattedMessage id="matrix-enable_globally" />}
              className="fs-5"
            />
            <p className="ms-3 fs-6">
              <FormattedMessage id="matrix-enable_globally_hint" />
            </p>
          </Form.Group>
          <Form.Group>
            <Form.Label><FormattedMessage id="matrix-include_users" /></Form.Label>
            <AsyncSelect
              isMulti
              value={includeUsers}
              matchProp="name"
              placeholder={selectPlaceholder}
              loadOptions={loadUserByName}
              onChange={this.handleIncludeUser}
              menuPosition="fixed"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label><FormattedMessage id="matrix-exclude_users" /></Form.Label>
            <AsyncSelect
              isMulti
              value={excludeUsers}
              matchProp="name"
              placeholder={selectPlaceholder}
              loadOptions={loadUserByName}
              onChange={this.handleExcludeUser}
              menuPosition="fixed"
            />
          </Form.Group>
        </Form>
      </AppModal>
    );
  }

  renderJsonModal() {
    const { matrice, showJsonBtn, showJsonModal } = this.state;
    const { intl } = this.props;

    return (
      <AppModal
        show={showJsonModal}
        onHide={this.handleJsonClose}
        title={<FormattedMessage id="matrix-json_configurations" />}
        primaryActionLabel={intl.formatMessage({ id: 'update' })}
        onPrimaryAction={() => this.handleJsonSave(matrice)}
        primaryActionDisabled={!showJsonBtn}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <Form className="row g-3">
          <Form.Group controlId="formControlId">
            <InputGroup>
              <InputGroup.Text><FormattedMessage id="id" /></InputGroup.Text>
              <Form.Control type="text" defaultValue={matrice.id} readOnly />
            </InputGroup>
          </Form.Group>
          <Form.Group controlId="formControlName">
            <InputGroup>
              <InputGroup.Text><FormattedMessage id="matrix-function_name" /></InputGroup.Text>
              <Form.Control type="text" defaultValue={matrice.name} readOnly />
            </InputGroup>
          </Form.Group>
          <Form.Group controlId="formControlJson">
            <JSONInput
              placeholder={matrice.configs}
              width="100%"
              onChange={(e) => this.onChangeJson(e)}
            />
          </Form.Group>
        </Form>
      </AppModal>
    );
  }

  render() {
    return (
      <div>
        {this.renderList()}
        {this.renderEditModal()}
        {this.renderJsonModal()}
      </div>
    );
  }
}

MatrixManagement.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(MatrixManagement);
