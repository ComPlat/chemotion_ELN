import React from 'react';
import {Col, Grid, Row, Table} from 'react-bootstrap';
//import Router, { DefaultRoute, Link, Route, RouteHandler } from 'react-router';

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
      <Grid border fluid>
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
            <Elements />
          </Col>
          <Col sm={2} md={2} lg={2}>
            <ContextActions />
          </Col>
        </Row>
      </Grid>
    )
  }
}

import ElementStore from './stores/ElementStore';

export default class Elements extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({
      currentElement: state.currentSample
    })
  }

  render() {
    let width = this.state.currentElement ? "75%" : 0
    let elementDetails;

    if(this.state.currentElement) {
      elementDetails = <SampleDetails />
    }

    return (
      <Table>
        <tbody>
        <tr valign="top" className="borderless">
          <td className="borderless">
            <List/>
          </td>
          <td className="borderless" width={width}>
            {elementDetails}
          </td>
        </tr>
        </tbody>
      </Table>
    )
  }
}

// // Configure React Routing
// let routes = (
//   <Route name="app" path="/" handler={App}>
//     <DefaultRoute handler={Elements}/>
//     <Route name="elements" handler={Elements}>
//       <Route name="sample" path="/sample/:id" handler={SampleDetails}/>
//     </Route>
//     <Route name="sharing" path="/sharing" handler={ShareModal}/>
//   </Route>
// );

// // see, e.g.,
// //
// http://stackoverflow.com/questions/26566317/invariant-violation-registercomponent-target-container-is-not-a-dom-elem
//   $(document).ready(function () {
//     Router.run(routes, function (Handler) {
//       React.render(<Handler/>, document.getElementById('router'));
//     });
//   });

$(document).ready(function () {
  React.render(<App />, document.getElementById('app'));
});
