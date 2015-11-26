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
      this.collectionLabels(this.state.element)
    );
  }

  labelStyle(label) {
    return label.is_shared ? "warning" : "info";
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

  labelWithPopover(title, labels) {
    let {element} = this.state;
    let label_popover = <Popover title={title}>{this.format_labels(labels)}</Popover>
    return (
      labels.length > 0 ?
        <OverlayTrigger trigger="click" rootClose placement="left" overlay={label_popover}>
          <span className="collection-label" key={element.type+element.id+title+labels.length}>
            <Label bsStyle={this.labelStyle(labels[0])}>In {labels.length} {title}</Label>
            &nbsp;
          </span> 
        </OverlayTrigger> : undefined
    );
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

      return (
        <div>
          {this.labelWithPopover("Collections", labels)}
          {this.labelWithPopover("Shared Collections", shared_labels)}
        </div>
      )
    }
  }
}
