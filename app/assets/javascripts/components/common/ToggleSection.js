import React, {Component} from 'react';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class ToggleSection extends React.Component {
  render() {
    let show = this.props.show;
    let showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'

    return (
      <div style={{float: 'right'}}>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="toggle_molecule">Toggle Section</Tooltip>}>
          <span style={{fontSize: 15, color: '#337ab7', lineHeight: '10px'}}>
            <i className={`glyphicon ${showIndicator}`}></i>
          </span>
        </OverlayTrigger>
      </div>
    )
  }
}
