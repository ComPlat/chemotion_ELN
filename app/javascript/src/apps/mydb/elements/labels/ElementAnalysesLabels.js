import React from 'react';
import { Button, Badge, OverlayTrigger, Popover } from 'react-bootstrap';

export default class ElementAnalysesLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    }
  }

  labelWithPopover(title, labels) {
    let { element } = this.state
    let experiment = <i className='fa fa-bar-chart' />

    let label_popover = (
      <Popover id={'labelpop' + element.id}>
        <Popover.Header as="h3">{title}</Popover.Header>
        <Popover.Body className="d-flex gap-1">
          {this.formatLabels(labels)}
        </Popover.Body>
      </Popover>
    )

    let status = title.match(/Unconfirmed/)
      ? <i className="fa fa-question" />
      : <i className="fa fa-check" />
    let total = Object.values(labels).reduce((a, b) => a + b, 0)

    return (
      <OverlayTrigger trigger="click" rootClose placement="left" overlay={label_popover}>
        <Button variant="light" size="xxsm" key={element.id} onClick={(event) => {event.stopPropagation()}}>
          {experiment} {total} {status}
        </Button>
      </OverlayTrigger>
    );
  }

  formatLabels(labels) {
    const regExp = /\(([^)]+)\)/;
    return Object.keys(labels).map((key) => {
      let key_syn = (regExp.exec(key || '') || ['']).pop().trim();
      if (key_syn === '') {
        key_syn = (key || '').split('|').pop().trim();
      };

      return (
        <Badge bg="gray-600" key={key}>
          {key_syn || "Analysis type Unkown"} - {labels[key]}
        </Badge>
      )
    })
  }

  render() {

    let { element } = this.state
    if (!element.tag) return null
    if (!element.tag.taggable_data) return null

    let analyses = element.tag.taggable_data.analyses

    if (!analyses) return null

    return (
      <>
        {analyses.unconfirmed && this.labelWithPopover('Unconfirmed Analysis', analyses.unconfirmed)}
        {analyses.confirmed && this.labelWithPopover('Confirmed Analyses', analyses.confirmed)}
      </>
    )
  }
}
