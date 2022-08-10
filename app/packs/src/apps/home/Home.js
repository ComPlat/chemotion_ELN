import React, { Component } from 'react';
import { Grid, Row } from 'react-bootstrap';

import Navigation from 'src/components/Navigation'
import XHome from 'src/components/extra/HomeXHome'
import WelcomeMessage from 'src/components/WelcomeMessage';

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
              <WelcomeMessage />
            </Row>
          </Grid>
        }
      </div>
    );
  }
}

export default Home;
