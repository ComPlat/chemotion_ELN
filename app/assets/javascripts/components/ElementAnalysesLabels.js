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
      <div style={{display: 'inline-block'}}>
        {this.confirmedAnalysesLabels(this.state.element)}
        {this.unconfirmedAnalysesLabels(this.state.element)}
      </div>
    );
  }


  confirmedAnalysesLabels(element) {
    if(element.analysis_kinds) {
      return Object.keys(element.analysis_kinds.confirmed).map((label, index) => {
        let count = element.analysis_kinds.confirmed[label].count
        let count_label = count > 1 ? "x"+count : ""
        return (
          <span className="collection-label" key={index}>
            <Label bsStyle="success">{label}</Label> {count_label}
            &nbsp;
          </span>
        )
      });
    }
  }

  unconfirmedAnalysesLabels(element) {
    if(element.analysis_kinds) {
      return Object.keys(element.analysis_kinds.unconfirmed).map((label, index) => {
        let count = element.analysis_kinds.unconfirmed[label].count
        let count_label = count > 1 ? "x"+count : ""
        return (
          <span className="collection-label" key={index}>
            <Label bsStyle="warning">{label}</Label> {count_label}
            &nbsp;
          </span>
        )
      });
    }
  }
}
