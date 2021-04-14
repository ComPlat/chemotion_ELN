import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row } from 'react-bootstrap';

import Navigation from '../components/Navigation'
import XHome from '../components/extra/HomeXHome'

const extraHomes = () => {
  const homes = [];
  const count = XHome.count || 0;
  for (let j = 0; j < count; j += 1) {
    homes.push(XHome[`content${j}`]);
  }
  return homes;
};

class Home extends Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <div>
        { XHome.count && XHome.count > 0
          ? extraHomes().map((Annex, i) => <Annex key={`Annex_${i}`} />)
          : <Grid fluid>
            <Row className="card-navigation">
              <Navigation />
            </Row>
            <Row className="card-content">
            </Row>
          </Grid>
        }
      </div>
    );
  }
}

// $(document).ready(function() {
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) { ReactDOM.render(<Home />, domElement); }
});
