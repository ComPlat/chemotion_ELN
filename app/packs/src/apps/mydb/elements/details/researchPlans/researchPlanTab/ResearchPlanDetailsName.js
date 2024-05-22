/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FormControl, FormGroup, Row, Col, OverlayTrigger, Tooltip, Button
} from 'react-bootstrap';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

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
          title=""
          className="fa fa-laptop pull-right"
          bsStyle="info"
          bsSize="xsmall"
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
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
        <div className="research-plan-name">
          <Row>
            <Col lg={8}>
              <FormGroup>
                <ControlLabel>Name</ControlLabel>
                { this.renderCopyToMetadataButton() }
                <FormControl
                  type="text"
                  value={value || ''}
                  onChange={(event) => onChange(event.target.value)}
                  disabled={disabled}
                  name="research_plan_name"
                />
              </FormGroup>
            </Col>
          </Row>
        </div>
      );
    }
    return (
      <div className="research-plan-name static">
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
