import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row } from 'react-bootstrap';

import Navigation from '../components/Navigation'
import WelcomeMessage from '../components/WelcomeMessage';


class Home extends Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <div>
        <Grid fluid>
          <Row className="card-navigation">
            <Navigation />
          </Row>
          <Row className="card-content">
            <WelcomeMessage />
          </Row>
        </Grid>
      </div>
    );
  }
}

// $(document).ready(function() {
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) { ReactDOM.render(<Home />, domElement); }
});
