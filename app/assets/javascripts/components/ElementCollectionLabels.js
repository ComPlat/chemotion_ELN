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

  collectionLabels(element) {
    return element.collection_labels.map((label, index) => {
      return (
        <span>
          <Label bsStyle="primary" key={index}>{label}</Label>
          &nbsp;
        </span>
      )
    });
  }
}

