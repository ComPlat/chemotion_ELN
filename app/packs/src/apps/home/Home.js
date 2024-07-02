import React, { Component } from 'react';
import { Row } from 'react-bootstrap';

import Navigation from 'src/components/navigation/Navigation'
import WelcomeMessage from 'src/apps/home/WelcomeMessage';
import Grid from 'src/components/legacyBootstrap/Grid'

class Home extends Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <div>
        <Grid fluid>
          <Row className="card-navigation">
            <Navigation isHidden />
          </Row>
          <Row className="card-content">
            <WelcomeMessage />
          </Row>
        </Grid>
      </div>
    );
  }
}

export default Home;
