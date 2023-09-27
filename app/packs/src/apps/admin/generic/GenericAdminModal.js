/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { ALL_TYPES } from 'src/apps/generic/Utils';

export default class GenericAdminModal extends Component {
  constructor(props) {
    super(props);
    this.handleAuthAdmin = this.handleAuthAdmin.bind(this);
  }

  renderButton(_params, _user) {
    const params = _params || [];
    const user = _user;
    return params.map((p, i) => (
      <Button
        key={`_auth_designer_button_${ALL_TYPES[i]}`}
        bsSize="sm"
        bsStyle={p ? 'warning' : 'default'}
        onClick={() =>
          this.handleAuthAdmin(user, `${ALL_TYPES[i]}s`.toLowerCase(), p)
        }
      >
        {p ? 'Revoke' : 'Grant'} Generic {ALL_TYPES[i]}
      </Button>
    ));
  }

  renderDescription(_params) {
    const params = _params || [];
    return params.map((p, i) => (
      <li key={`_description_${ALL_TYPES[i]}`}>
        Currently {p ? '' : 'NOT'} acting as the Designer of the Generic&nbsp;
        {ALL_TYPES[i]}
      </li>
    ));
  }

  handleAuthAdmin(user, type, value) {
    const { fnCb } = this.props;
    const params = {
      user_id: user.id,
      auth_generic_admin: {},
    };
    params.auth_generic_admin[type] = !value;
    AdminFetcher.updateAccount(params).then(() => fnCb(user));
  }

  render() {
    const { user, fnShowModal } = this.props;
    const { elements, segments, datasets } = user.generic_admin || {};
    return (
      <Modal show onHide={() => fnShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{`Grant/Revoke Generic Designer (user: ${user.name})`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ButtonToolbar>
            {this.renderButton([elements, segments, datasets], user)}
          </ButtonToolbar>
          <ul>{this.renderDescription([elements, segments, datasets])}</ul>
        </Modal.Body>
      </Modal>
    );
  }
}

GenericAdminModal.propTypes = {
  user: PropTypes.object.isRequired,
  fnShowModal: PropTypes.func.isRequired,
  fnCb: PropTypes.func,
};
GenericAdminModal.defaultProps = { fnCb: () => {} };
