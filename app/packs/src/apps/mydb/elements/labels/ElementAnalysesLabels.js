import React from 'react';
import { Badge, OverlayTrigger, Popover } from 'react-bootstrap';

export default class ElementAnalysesLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    }
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

  labelWithPopover(title, labels) {
    let { element } = this.state
    let experiment = <i className='fa fa-bar-chart' />

    let label_popover = (
      <Popover title={title} id={'labelpop' + element.id}>
        {this.formatLabels(labels)}
      </Popover>
    )

    let status = title.match(/Unconfirmed/)
      ? <i className="fa fa-question" />
      : <i className="fa fa-check" />
    let total = Object.values(labels).reduce((a, b) => a + b, 0)

    return (
      <OverlayTrigger trigger="click" rootClose placement="left" overlay={label_popover}>
        <span className="collection-label" key={element.id}>
          <Badge>
            {experiment} {total} {status}
          </Badge>
        </span>
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
        <span className="collection-label" key={key}>
          <Badge variant='light' bsSize='xs'>
            {key_syn || "Analysis type Unkown"} - {labels[key]}
          </Badge>
        </span>
      )
    })
  }
}
