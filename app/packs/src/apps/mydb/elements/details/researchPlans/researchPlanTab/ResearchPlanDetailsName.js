/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Row, Col, OverlayTrigger, Tooltip, Button
} from 'react-bootstrap';

export default class ResearchPlanDetailsName extends Component {
  renderCopyToMetadataButton() {
    const { isNew, onCopyToMetadata } = this.props;
    const metadataTooltipText = 'Copy Name to Metadata';
    return (
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={<Tooltip id="metadataTooltip">{metadataTooltipText}</Tooltip>}
      >
        <Button
          id="copyMetadataButton"
          className="fa fa-laptop pull-right"
          variant="info"
          size="xsm"
          onClick={() => onCopyToMetadata(null, 'name')}
          disabled={isNew}
        />
      </OverlayTrigger>
    );
  }

  render() {
    const {
      value, disabled, onChange, edit
    } = this.props;
    if (edit) {
      return (
        <Row>
          <Col sm={8}>
            <Form.Group>
              <Form.Label className="fw-bold">Name</Form.Label>
              {this.renderCopyToMetadataButton()}
              <Form.Control
                type="text"
                value={value || ''}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                name="research_plan_name"
              />
            </Form.Group>
          </Col>
        </Row>
      );
    }
    return (
      <div className="my-3">
        <h1>{value}</h1>
      </div>
    );
  }
}

ResearchPlanDetailsName.propTypes = {
  value: PropTypes.string,
  disabled: PropTypes.bool,
  isNew: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
  onCopyToMetadata: PropTypes.func
};
