import React from 'react';
import {Col, Grid, Row} from 'react-bootstrap';
import Router from 'react-router';
import { DefaultRoute, Link, Route, RouteHandler } from 'react-router';

import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import MainContent from './MainContent';
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
          <Col md={3}>
            <ElementFilter />
          </Col>
          <Col md={9}>
            ...
          </Col>
        </Row>
        <Row>
          <Col md={3}>
            <CollectionTree />
          </Col>
          <Col md={7}>
            <MainContent />
          </Col>
          <Col md={2}>
            <ContextActions />
          </Col>
        </Row>
        <RouteHandler />
      </Grid>
    )
  }
}

// Configure React Routing
let routes = (
  <Route name="app" path="/" handler={App}>
    <Route name="sample-details" path="/sample/:id" handler={SampleDetails}/>
  </Route>
);

// see, e.g.,
// http://stackoverflow.com/questions/26566317/invariant-violation-registercomponent-target-container-is-not-a-dom-elem
$(document).ready(function () {
  Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.getElementById('router'));
  });
});
