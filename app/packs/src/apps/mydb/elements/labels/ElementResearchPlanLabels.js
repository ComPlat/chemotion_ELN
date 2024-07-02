import React from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import Label from 'src/components/legacyBootstrap/Label'

export default class ElementResearchPlanLabels extends React.Component {
  constructor(props) {

    super(props);
    this.state = {
      research_plans: props.plans
    };

    this.handleOnClick = this.handleOnClick.bind(this);
    this.preventOnClick = this.preventOnClick.bind(this);
  }

  handleOnClick(label, e) {
    e.stopPropagation();

    let url = "/research_plan/" + label.id;
    Aviator.navigate(url);
  }

  preventOnClick(e) {
    e.stopPropagation();
  }

  formatLabels(labels) {
    return labels.map((label, index) => {
      return (
        <span className="collection-label" key={index}>
          <Button variant="light" size="sm" onClick={e => this.handleOnClick(label, e)}>
            {label.name}
          </Button>
          &nbsp;
        </span>
      );
    });
  }

  render() {
    const { research_plans } = this.state;

    let researchPlanOverlay = (
      <Popover className="scrollable-popover" id="element-collections">    
        <Popover.Header as="h3">Research Plans</Popover.Header>
        <Popover.Body>
          {this.formatLabels(research_plans)}
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
        <span className="collection-label" >
          <Label>
            <i className="fa fa-file-text-o me-1" />
            {research_plans.length}
          </Label>
        </span>
      </OverlayTrigger>
    );
  }
}
