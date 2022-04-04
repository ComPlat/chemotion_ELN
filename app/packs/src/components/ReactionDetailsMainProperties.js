import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col,
  FormGroup,
  FormControl,
  ControlLabel,
  Grid,
  Row
} from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import { statusOptions } from './staticDropdownOptions/options';
import { permitOn } from './common/uis';
import GeneralProcedureDnd from './GeneralProcedureDnD';
import { rolesOptions } from './staticDropdownOptions/options';

export default class ReactionDetailsMainProperties extends Component {
  constructor(props) {
    super(props);

    this.onChangeRole = this.onChangeRole.bind(this);
    this.renderRole = this.renderRole.bind(this);
  }

  renderGPDnD() {
    const { reaction } = this.props;
    return (
      <GeneralProcedureDnd
        reaction={reaction}
      />
    );
  }

  renderRolesOptions(opt) {
    const className = `fa ${opt.icon} ${opt.bsStyle}`;
    return (
      <span>
        <i className={className} />
        <span className="spacer-10" />
        {opt.label}
      </span>
    );
  }

  onChangeRole(e) {
    const { onInputChange } = this.props;
    const value = e && e.value;
    onInputChange('role', value);
  }

  renderRoleSelect() {
    const { role } = this.props.reaction;
    return (
      <Select
        disabled={!permitOn(this.props.reaction)}
        name="role"
        options={rolesOptions}
        optionRenderer={this.renderRolesOptions}
        multi={false}
        clearable
        value={role}
        onChange={this.onChangeRole}
      />
    );
  }

  renderRole() {
    const { role } = this.props.reaction;
    const accordTo = role === 'parts' ? 'According to' : null;
    return (
      <span>
        <Col md={3} style={{ paddingLeft: '6px' }}>
          <FormGroup>
            <ControlLabel>Role</ControlLabel>
            {this.renderRoleSelect()}
          </FormGroup>
        </Col>
        <Col md={3} style={{ paddingLeft: '6px' }}>
          <FormGroup>
            <ControlLabel>{accordTo}</ControlLabel>
            {this.renderGPDnD()}
          </FormGroup>
        </Col>
      </span>
    );
  }

  render() {
    const { reaction, onInputChange } = this.props;

    return (
      <Grid fluid style={{ paddingLeft: 'unset' }}>
        <Row>
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Name</ControlLabel>
              <FormControl
                id={uuid.v4()}
                name="reaction_name"
                type="text"
                value={reaction.name || ''}
                placeholder="Name..."
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('name')}
                onChange={event => onInputChange('name', event)}
              />
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Status</ControlLabel>
              <Select
                className="status-select reaction-status-change"
                name="status"
                key={reaction.status}
                multi={false}
                options={statusOptions}
                value={reaction.status}
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('status')}
                onChange={(event) => {
                  const wrappedEvent = {
                    target: { value: event && event.value },
                  };
                  onInputChange('status', wrappedEvent);
                }}
              />
            </FormGroup>
          </Col>
          <Row>
            {this.renderRole()}
          </Row>
        </Row>
      </Grid>
    );
  }
}

ReactionDetailsMainProperties.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reaction: PropTypes.object,
  onInputChange: PropTypes.func
};

ReactionDetailsMainProperties.defaultProps = {
  reaction: {},
  onInputChange: () => {}
};
