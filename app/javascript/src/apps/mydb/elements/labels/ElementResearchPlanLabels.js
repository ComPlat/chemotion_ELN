/* eslint-disable react/prop-types */
import React from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import { aviatorNavigation } from 'src/utilities/routesUtils';

export default class ElementResearchPlanLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      researchPlans: props.plans
    };

    this.handleOnClick = this.handleOnClick.bind(this);
    this.preventOnClick = this.preventOnClick.bind(this);
  }

  handleOnClick(label, e) {
    e.stopPropagation();

    aviatorNavigation('research_plan', label.id, true, true);
  }

  preventOnClick(e) {
    e.stopPropagation();
  }

  formatLabels(labels) {
    return labels.map((label) => (
      <span className="d-inline-block m-1" key={label}>
        <Button variant="light" size="sm" onClick={e => this.handleOnClick(label, e)}>
          {label.name}
        </Button>
      </span>
    ));
  }

  render() {
    const { researchPlans } = this.state;

    const researchPlanOverlay = (
      <Popover className="overflow-auto" id="element-collections">
        <Popover.Header as="h3">Research Plans</Popover.Header>
        <Popover.Body className="d-flex flex-column">
          {this.formatLabels(researchPlans)}
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger
        trigger="click"
        rootClose
        placement="right"
        overlay={researchPlanOverlay}
        className="d-inline-block"
      >
        <Button size="xxsm" variant="light">
          <i className="fa fa-file-text-o me-1" />
        </Button>
      </OverlayTrigger>
    );
  }
}
