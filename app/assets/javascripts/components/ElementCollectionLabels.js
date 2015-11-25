import React from 'react';
import {Label, OverlayTrigger, Popover} from 'react-bootstrap';

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
    if(label.is_shared == false) {
      return "info";
    } else {
      return "warning";
    }
  }

  format_labels(labels) {
    return labels.map((label, index) => {
      return (
        <span className="collection-label" key={index}>
          <Label bsStyle={this.labelStyle(label)}>{label.name}</Label>
          &nbsp;
        </span>
      )
    });
  }

  collectionLabels(element) {
    if(element.collection_labels) {
      let shared_labels = [];
      let labels = [];
      element.collection_labels.map((label, index) => {
        if (label.is_shared) {
          shared_labels.push(label)
        } else {
          labels.push(label)
        }
      });

      let shared_label_popover = <Popover title="Shared Collections">{this.format_labels(shared_labels)}</Popover>

      let label_popover = <Popover title="Collections">{this.format_labels(labels)}</Popover>

      let shared_label = shared_labels.length > 0 ?
        <OverlayTrigger trigger="hover" placement="top" overlay={shared_label_popover}>
          <span className="collection-label" key={element.id+"_shared_labels_"+shared_labels.length}>
            <Label bsStyle="warning">In {shared_labels.length} Shared Collections</Label>
            &nbsp;
          </span>
        </OverlayTrigger> : undefined

      let collection_label = labels.length > 0 ?
        <OverlayTrigger trigger="hover" placement="top" overlay={label_popover}>
          <span className="collection-label" key={element.id+"_labels_"+shared_labels.length}>
            <Label bsStyle="info">In {labels.length} Collections</Label>
            &nbsp;
          </span> 
        </OverlayTrigger>: undefined

      return (
        <div>
          {collection_label}
          {shared_label}
        </div>
      )
    }
  }
}
