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
      <div style={{display: 'inline-block'}}>
        {this.analysesLabels(this.state.element)}
      </div>
    );
  }



  analysesLabels(element){
    if(element.analysis_kinds) {
      let unconfirmed = Object.keys(element.analysis_kinds.unconfirmed).map((analysis_kind) => element.analysis_kinds.unconfirmed[analysis_kind]);
      let confirmed   = Object.keys(element.analysis_kinds.confirmed).map((analysis_kind) => element.analysis_kinds.confirmed[analysis_kind]);
      let unconfirmedTitle = element.analysis_kinds.count.unconfirmed > 1 ? 'Unconfirmed Analyses' : 'Unconfirmed Analysis';
      let confirmedTitle = element.analysis_kinds.count.confirmed > 1 ? 'Confirmed Analyses' : 'Confirmed Analysis';

      return (
        <div style={{display: 'inline-block'}}>
          {this.labelWithPopover(unconfirmedTitle, unconfirmed, element.analysis_kinds.count.unconfirmed)}
          {this.labelWithPopover(confirmedTitle, confirmed, element.analysis_kinds.count.confirmed)}
        </div>
      )
    } else {
      return (<div></div>)
    }

  }

  labelWithPopover(title, labels,totalCount=0) {

    let {element} = this.state;
    let experiment = <i className='fa fa-bar-chart'/>; // <Glyphicon glyph= 'dashboard'/>
    let label_popover = <Popover title={title} id={'labelpop'+element.id}>{this.formatLabels(labels)}</Popover>
    let status =  title.match(/Unconfirmed/) ? <i className="fa fa-question" /> : <i className="fa fa-check"/> ;

    return (
      labels.length > 0 ?
        <OverlayTrigger trigger="click" rootClose placement="left" overlay={label_popover}>
          <span className="collection-label" key={element.id}>
            <Label  style={{backgroundColor:'white',color:'black', border: '1px solid grey'}}>{experiment} {totalCount} {status} </Label>

          </span>
        </OverlayTrigger> : undefined
    );
  }

  formatLabels(labels) {
    return labels.map((label, index) => {
      return (
        <span className="collection-label" key={index}>
          <Label bsStyle='default' bsSize='xs' >{label.label} {label.count}  </Label>
        </span>
      )
    });
  }


}
