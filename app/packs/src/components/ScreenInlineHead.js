import React, { Component } from 'react';


export default class ScreenInlineHead extends Component {

  render() {
    return (
      <React.Fragment>
        <th style={{ width: 150 }}>Screen</th>
        <th style={{ width: 150 }}>Name</th>
        <th style={{ width: 150 }}>Collaborator</th>
        <th style={{ width: 150 }}>Requirements</th>
        <th style={{ width: 150 }}>Conditions</th>
        <th style={{ width: 150 }}>Result</th>
      </React.Fragment>
    )
  }

}
