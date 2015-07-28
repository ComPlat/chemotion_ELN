import React from 'react';
import {Col, Grid, Row} from 'react-bootstrap';

import Navigation from './Navigation';
import CollectionTree from './CollectionTree';

class App extends React.Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <Grid fluid>
        <Row>
          <Navigation />
        </Row>
        <Row>
          <Col md={3}>
            <CollectionTree />
          </Col>
          <Col md={9}>

          </Col>
        </Row>
      </Grid>
    )
  }
}

module.exports = App;
