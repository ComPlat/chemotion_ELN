import React from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';

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

    let url = `/research_plan/${label.id}`;
    Aviator.navigate(url);
  }

  preventOnClick(e) {
    e.stopPropagation();
  }

  formatLabels(labels) {
    return labels.map((label, index) => (
      <span className="d-inline-block m-1" key={index}>
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
