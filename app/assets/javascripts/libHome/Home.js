import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import { Grid, Row} from 'react-bootstrap';

import Navigation from '../components/Navigation'

class Home extends Component {
  constructor(props) {
    super();

  }

  render() {
    return (

      <Grid fluid>
        <Row className="card-navigation">
          <Navigation/>
        </Row>
        <Row className="card-content">
        </Row>
      </Grid>
    )
  }
}

$(document).ready(function() {
  let domElement = document.getElementById('Home');
  if (domElement){
    ReactDOM.render(<Home />, domElement);
  }
});
