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
          <Button variant="default" size="sm" onClick={e => this.handleOnClick(label, e)}>
            {label.name}
          </Button>
          &nbsp;
        </span>
      );
    });
  }

  renderCollectionsLabels(research_plans) {
    if (research_plans == undefined) return <span />;

    return (
      <div>
        <h3 className="popover-title">Research Plans</h3>
        <div className="popover-content">
          {this.formatLabels(research_plans)}
        </div>
      </div>
    );
  }

  render() {
    const { research_plans } = this.state;

    let placement = 'right';
    let researchPlanOverlay = (
      <Popover className="collection-overlay" id="element-collections">
        {this.renderCollectionsLabels(research_plans)}
      </Popover>
    );

    return (
      <div style={{display: "inline-block"}} onClick={this.preventOnClick}>
        <OverlayTrigger
          trigger="click"
          rootClose
          placement={placement}
          overlay={researchPlanOverlay}
        >
          <span className="collection-label" >
            <Label>
              <i className="fa fa-file-text-o" />
                {" " + research_plans.length}
            </Label>
          </span>
        </OverlayTrigger>
      </div>
    );
  }
}
