import React, { Component } from 'react';


export default class WellplateInlineHead extends Component {

  render() {
    return (
      <React.Fragment>
        <th style={{ width: 150 }}>Wellplate</th>
        <th style={{ width: 150 }}>Name</th>
        <th style={{ width: 600 }}>{/* placeholder */}</th>
      </React.Fragment>
    )
  }

}
