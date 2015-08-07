import React from 'react';
import ElementsTable from './ElementsTable';

export default class List extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <ElementsTable type='sample'/>
    )
  }
}
