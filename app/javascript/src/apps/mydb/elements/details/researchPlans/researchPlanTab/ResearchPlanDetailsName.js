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
        delay={{ show: 500, hide: 100 }}
        overlay={<Tooltip id="metadataTooltip">{metadataTooltipText}</Tooltip>}
      >
        <Button
          id="copyMetadataButton"
          variant="info"
          size="xsm"
          onClick={() => onCopyToMetadata(null, 'name')}
          disabled={isNew}
          className="ms-auto"
        >
          <i className="fa fa-laptop" />
        </Button>
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
            <Form.Group className="mt-2">
              <div className="d-flex align-items-center">
                <Form.Label className="mb-1 me-2 d-flex">Name</Form.Label>
                {this.renderCopyToMetadataButton()}
              </div>
              <Form.Control
                type="text"
                value={value || ''}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                name="research_plan_name"
                className="p-2"
              />
            </Form.Group>
          </Col>
        </Row>
      );
    }
    return (
      <div className="my-3">
        <h2>{value}</h2>
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
