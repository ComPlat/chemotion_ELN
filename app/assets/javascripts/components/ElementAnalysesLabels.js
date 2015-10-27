import React from 'react';
import {Label} from 'react-bootstrap';

export default class ElementAnalysesLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    }
  }

  render() {
    return (
      <div>
        {this.confirmedAnalysesLabels(this.state.element)} <br/>
        {this.unconfirmedAnalysesLabels(this.state.element)}
      </div>
    );
  }


  confirmedAnalysesLabels(element) {
    if(element.analysis_kinds) {
      return element.analysis_kinds.confirmed.map((label, index) => {
        return (
          <span className="collection-label" key={index}>
            <Label bsStyle="success">{label}</Label>
            &nbsp;
          </span>
        )
      });
    }
  }

  unconfirmedAnalysesLabels(element) {
    if(element.analysis_kinds) {
      return element.analysis_kinds.unconfirmed.map((label, index) => {
        return (
          <span className="collection-label" key={index}>
            <Label bsStyle="warning">{label}</Label>
            &nbsp;
          </span>
        )
      });
    }
  }
}
