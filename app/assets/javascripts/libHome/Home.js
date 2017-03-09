import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import { Grid, Row} from 'react-bootstrap';

import Navigation from '../components/Navigation'
import XHome from '../components/extra/HomeXHome'


class Home extends Component {
  constructor(props) {
    super();

  }

  extraHomes(){
    let homes = []
    let count = XHome.count || 0
    for (let j=0;j < count;j++){
      homes.push(XHome["content"+j])
    }
    return homes;
  }


  render() {
    return (<div>
      { XHome.count && XHome.count > 0
        ?  this.extraHomes().map((Home,i)=><Home key={'home'+i}/>)
        :  <Grid fluid>
          <Row className="card-navigation">
            <Navigation/>
          </Row>
          <Row className="card-content">
          </Row>
        </Grid>
      }
      </div>
    )
  }
}

$(document).ready(function() {
  let domElement = document.getElementById('Home');
  if (domElement){
    ReactDOM.render(<Home />, domElement);
  }
});
