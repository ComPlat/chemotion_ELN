import React from 'react';

import ElementsTable from './ElementsTable';

class MainContent extends React.Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <ElementsTable type='sample'/>
    )
  }
}

module.exports = MainContent;
