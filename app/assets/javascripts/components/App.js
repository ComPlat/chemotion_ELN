import React from 'react';
import {Col, Grid, Row} from 'react-bootstrap';
import Router, { DefaultRoute, Link, Route, RouteHandler } from 'react-router';

import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import List from './List';
import ManagingActions from './ManagingActions';
import ContextActions from './ContextActions';
import ElementFilter from './ElementFilter';
import SampleDetails from './SampleDetails';
import ShareModal from './managing_actions/ShareModal';

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
            <ElementFilter />
          </Col>
          <Col sm={9} md={9} lg={9}>
            <ManagingActions />
          </Col>
        </Row>
        <Row>
          <Col sm={3} md={3} lg={3}>
            <CollectionTree />
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
    <Route name="sharing" path="/sharing" handler={ShareModal}/>
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
