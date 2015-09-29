import React from 'react';
import {Label} from 'react-bootstrap';

export default class ElementCollectionLabels extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    }
  }

  render() {
    return (
      <div>
        {this.collectionLabels(this.state.element)}
      </div>
    );
  }

  labelStyle(label) {
    if(label[1] == false) {
      return "primary";
    } else {
      return "warning";
    }
  }

  collectionLabels(element) {
    if(element.collection_labels) {
      return element.collection_labels.map((label, index) => {
        return (
          <span key={index}>
            <Label bsStyle={this.labelStyle(label)}>{label[0]}</Label>
            &nbsp;
          </span>
        )
      });
    }

  }
}
