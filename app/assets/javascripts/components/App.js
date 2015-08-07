import React from 'react';
import {Col, Grid, Row} from 'react-bootstrap';
import Router, { DefaultRoute, Link, Route, RouteHandler } from 'react-router';

import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import List from './List';
import ContextActions from './ContextActions';
import ElementFilter from './ElementFilter';
import SampleDetails from './SampleDetails';

export default class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Grid fluid>
        <Row>
          <Navigation />
        </Row>
        <Row>
          <Col sm={3} md={3} lg={3}>
            <Row>
              <ElementFilter />
            </Row>
            <Row>
              <CollectionTree />
            </Row>
          </Col>
          <Col sm={7} md={7} lg={7}>
            <RouteHandler />
          </Col>
          <Col sm={2} md={2} lg={2}>
            <ContextActions />
          </Col>
        </Row>
      </Grid>
    )
  }
}

// Configure React Routing
let routes = (
  <Route name="app" path="/" handler={App}>
    <DefaultRoute handler={List}/>
    <Route name="list" path="/list" handler={List}/>
    <Route name="sample" path="/sample/:id" handler={SampleDetails}/>
  </Route>
);

// see, e.g.,
//
http://stackoverflow.com/questions/26566317/invariant-violation-registercomponent-target-container-is-not-a-dom-elem
  $(document).ready(function () {
    Router.run(routes, function (Handler) {
      React.render(<Handler/>, document.getElementById('router'));
    });
  });
