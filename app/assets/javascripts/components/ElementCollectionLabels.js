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
    if(element.collection_labels) {
      return element.collection_labels.map((label, index) => {
        return (
          <span key={index}>
            <Label bsStyle="primary">{label}</Label>
            &nbsp;
          </span>
        )
      });
    }

  }
}

