import React, {Component} from 'react';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';
var _ = require('lodash');

export default class Formula extends React.Component {
  render() {
    let content = ''

    if(this.props.formula) {
      let keys = this.props.formula.split(/([A-Za-z]{1}[a-z]{0,2})(\d*)/)
      content = _.compact(keys).map(function(item) {
        if((/\d+/).test(item))
          return (<sub>{item}</sub>);
        else
          return item;
      })
    }

    return (
      <span>
        {content}
      </span>
    );
  }
}
