import React from 'react';
import ReactDOM from 'react-dom';
import {Label, OverlayTrigger, Popover,Glyphicon,
  Button, Overlay} from 'react-bootstrap';

import UserStore from './stores/UserStore';

export default class ElementCollectionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    }

    this.handleOnClick = this.handleOnClick.bind(this)
    this.preventOnClick = this.preventOnClick.bind(this)
  }

  handleOnClick(label, e, is_synchronized) {
    e.stopPropagation()

    let collectionUrl = is_synchronized ? "/scollection" : "/collection"
    let url = collectionUrl + "/" + label.id + "/" +
              this.state.element.type + "/" + this.state.element.id

    Aviator.navigate(url)
  }

  preventOnClick(e) {
    e.stopPropagation()
  }

  labelStyle(label) {
    return label.is_shared ? "warning" : "info"
  }

  formatLabels(labels, is_synchronized) {
    return labels.map((label, index) => {
      return (
        <span className="collection-label" key={index}>
          <Button bsStyle='default' bsSize='xs'
                  onClick={(e) => this.handleOnClick(label, e, is_synchronized)} >
            {label.name}
          </Button>
          &nbsp;
        </span>
      )
    })
  }

  renderCollectionsLabels(collectionName, labels, is_synchronized = false) {
    if (labels.length == 0) return <span />

    return (
      <div>
        <h3 className="popover-title">{collectionName}</h3>
        <div className="popover-content">
          {this.formatLabels(labels, is_synchronized)}
        </div>
      </div>
    )
  }

  render() {
    const {element} = this.state

    if (!element.tag || !element.tag.taggable_data ||
        !element.tag.taggable_data.collection_labels)
      return (<span />)

    const {currentUser} = UserStore.getState()

    let placement = "left"
    if (this.props.placement) placement = this.props.placement

    let collection_labels = element.tag.taggable_data.collection_labels
    let shared_labels = []
    let labels = []
    let sync_labels = []

    collection_labels.map((label, index) => {
      if (label.is_shared == false && label.user_id == currentUser.id) {
        labels.push(label)
      } else if (label.is_shared == true && label.shared_by_id == currentUser.id) {
        shared_labels.push(label)
      } else if (label.is_synchronized == true) {
        sync_labels.push(label)
      }
    })

    let total_shared_collections = shared_labels.length + sync_labels.length

    if (labels.length == 0 && total_shared_collections == 0)
      return (<span></span>)

    let collectionOverlay = (
      <Popover className="collection-overlay">
        {this.renderCollectionsLabels("My Collections", labels)}
        {this.renderCollectionsLabels("Shared Collections", shared_labels)}
        {this.renderCollectionsLabels("Synchronized Collections", sync_labels, true)}
      </Popover>
    )

    return (
      <div  style={{display: "inline-block"}} onClick={this.preventOnClick}>
      <OverlayTrigger trigger="click" rootClose placement={placement}
          overlay={collectionOverlay}>
        <span className="collection-label" key={element.id}>
          <Label>
            <i className='fa fa-list'/>
            {" " + labels.length} {" - "}
            {total_shared_collections + " "} <i className="fa fa-share-alt"/>
          </Label>
        </span>
      </OverlayTrigger>
      </div>
    )
  }
}
