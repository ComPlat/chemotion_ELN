import React from 'react';
import {Label, OverlayTrigger, Popover,Glyphicon, Button} from 'react-bootstrap';

export default class ElementCollectionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element,
      hover: false
    }

    this.toggleHover = this.toggleHover.bind(this)
    this.handleOnClick = this.handleOnClick.bind(this)
    this.preventOnClick = this.preventOnClick.bind(this)
  }

  toggleHover() {
    this.setState({hover: !this.state.hover})
  }

  handleOnClick(label, e) {
    e.stopPropagation()

    let url = "/collection/" + label.id + "/" + this.state.element.type +
              "/" + this.state.element.id
    Aviator.navigate(url)
  }

  preventOnClick(e) {
    e.stopPropagation()
  }

  render() {
    return this.collectionLabels(this.state.element);
  }

  labelStyle(label) {
    return label.is_shared ? "warning" : "info";
  }

  formatLabels(labels) {
    return labels.map((label, index) => {
      return (
        <span className="collection-label" key={index}>
          <Button bsStyle='default' bsSize='xs'
                  onClick={(e) => this.handleOnClick(label, e)} >
            {label.name}
          </Button>
          &nbsp;
        </span>
      )
    });
  }

  labelWithPopover(title, labels) {
    let {element} = this.state;
    let collection = <i className='fa fa-list'/>
    let label_popover = <Popover title={title} id={'labelpop'+element.id}>
                          {this.formatLabels(labels)}
                        </Popover>
    let shared =  title.match(/Shared/) ? <i className="fa fa-share-alt"/> : ""
    let labelStyle = {
      backgroundColor:'white',
      color:'black',
      border: '1px solid grey'
    }

    let {hover} = this.state
    if (hover == true) {
     labelStyle.backgroundColor = '#19B5FE'
    } else {
      labelStyle.backgroundColor = 'white'
    }

    return (
      labels.length > 0 ?
        <OverlayTrigger trigger="click" rootClose placement="left"
                        overlay={label_popover}>
          <span className="collection-label" key={element.id}>
            <Label style={labelStyle}
                   onMouseEnter={this.toggleHover}
                   onMouseLeave={this.toggleHover}>
              {collection} {labels.length} {shared}
            </Label>
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

      let unsharedTitle = labels.length > 1
                          ? 'Collections'
                          : 'Collection';
      let sharedTitle = shared_labels.length > 1
                        ? 'Shared Collections'
                        : 'Shared Collection';

      return (
        <div style={{display: 'inline-block'}} onClick={this.preventOnClick}>
          {this.labelWithPopover(unsharedTitle, labels)}
          {this.labelWithPopover(sharedTitle, shared_labels)}
        </div>
      )
    } else {
      return (<span></span>)
    }
  }
}
