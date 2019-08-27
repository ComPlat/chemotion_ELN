import React from 'react';
import {Label, OverlayTrigger, Popover,Glyphicon, Button} from 'react-bootstrap';

export default class ElementAnalysesLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    }
  }

  render() {

    return (
      <div style={{display: 'inline-block'}}
          onClick={(e) => { e.stopPropagation() }}>
        {this.analysesLabels(this.state.element)}
      </div>
    );
  }



  analysesLabels(element) {
    if (!element.tag) return (<span />)
    if (!element.tag.taggable_data) return (<span />)

    let analyses = element.tag.taggable_data.analyses

    if (!analyses) return (<span />)

    let unconfirmedTitle = 'Unconfirmed Analysis'
    if (analyses.Unconfirmed && Object.keys(analyses.unconfirmed).length > 1)
      unconfirmedTitle = 'Unconfirmed Analyses'

    let confirmedTitle = 'Confirmed Analysis'
    if (analyses.Confirmed && Object.keys(analyses.confirmed).length > 1)
      confirmedTitle = 'Confirmed Analyses'

    return (
      <div style={{display: 'inline-block'}}>
        {this.labelWithPopover(unconfirmedTitle, analyses.unconfirmed)}
        {this.labelWithPopover(confirmedTitle, analyses.confirmed)}
       </div>
    )
  }

  labelWithPopover(title, labels) {
    if (!labels) return (<span />)

    let {element} = this.state
    let experiment = <i className='fa fa-bar-chart'/>

    let label_popover = (
      <Popover title={title} id={'labelpop' + element.id}>
        {this.formatLabels(labels)}
      </Popover>
    )

    let status = title.match(/Unconfirmed/)
                 ? <i className="fa fa-question" />
                 : <i className="fa fa-check"/>
    let total = Object.values(labels).reduce((a, b) => a + b, 0)

    return (
      <OverlayTrigger trigger="click" rootClose placement="left" overlay={label_popover}>
        <span className="collection-label" key={element.id}>
          <Label>
            {experiment} {total} {status}
          </Label>
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
          <Label bsStyle='default' bsSize='xs'>
            {key_syn || "Analysis type Unkown"} - {labels[key]}
          </Label>
        </span>
      )
    })
  }
}
