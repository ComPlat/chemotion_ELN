import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Panel, Button, FormControl, Label } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Select from 'react-select';
import uuid from 'uuid';
import UserStore from '../stores/UserStore';
import UserActions from '../actions/UserActions';
import AdminFetcher from '../fetchers/AdminFetcher';
import UsersFetcher from '../fetchers/UsersFetcher';
import MatrixCheck from '../common/MatrixCheck';


export default class UserCounter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      klasses: []
    };
    this.onChange = this.onChange.bind(this);
    this.fetchKlasses = this.fetchKlasses.bind(this);
    this.handleCounterChange = this.handleCounterChange.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    this.fetchKlasses();
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({ currentUser: state.currentUser }); 
      this.fetchKlasses();
    }
  }


  handleCounterChange(key, value) {
    const { currentUser } = this.state;
    const counters = (currentUser && currentUser.counters) || {};
    counters[key] = value;
    currentUser.counters = counters;
    this.setState({
      currentUser
    });
  }

  handleUpdate(type) {
    const { currentUser } = this.state;
    const counters = (currentUser && currentUser.counters) || {};

    UsersFetcher.updateUserCounter({
      type,
      counter: counters[type] || 0
    }).then(() => {
      document.location.href = '/';
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  fetchKlasses() {
    const { currentUser } = this.state;
    console.log(currentUser);
    console.log(MatrixCheck(currentUser && currentUser.matrix, 'genericElement'));
    // if (MatrixCheck(currentUser && currentUser.matrix, 'genericElement')) {
    //   AdminFetcher.fetchElementKlasses()
    //     .then((result) => {
    //       this.setState({ klasses: result.klass || [] });
    //     });
    // }

    AdminFetcher.fetchElementKlasses()
      .then((result) => {
        this.setState({ klasses: result.klass || [] });
      });
  }

  render() {
    const { currentUser, klasses } = this.state;

    console.log(klasses);
    const counterBody = klasses.map((klass) => {
      const counter = parseInt((currentUser && currentUser.counters[klass.name]) || 0, 10);
      const nextNum = `${currentUser && currentUser.initials}-${klass.klass_prefix}${counter + 1}`;
      return (
        <div key={uuid.v1()} style={{ marginTop: 10 }}>
          <Row key={uuid.v1()}>
            <Col sm={2}>{klass.label}</Col>
            <Col sm={1}>{klass.klass_prefix}</Col>
            <Col sm={3}>
              <FormControl type="number" value={counter} onChange={(e) => this.handleCounterChange(klass.name, e.target.value)} min={0} />
            </Col>
            <Col sm={2}>{nextNum}</Col>
            <Col sm={4}><Button bsStyle="primary" onClick={() => this.handleUpdate(klass.name)}>Update counter</Button></Col>
          </Row>
        </div>
      );
    });

    if (klasses && klasses.length == 0) {
      return (<span />);
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title>
            Element Counter
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <Row>
            <Col sm={2}><b><u>Klass Label</u></b></Col>
            <Col sm={1}><b><u>Prefix</u></b></Col>
            <Col sm={3}><b><u>Counter starts at</u></b></Col>
            <Col sm={2}><b><u>Next Label</u></b></Col>
            <Col sm={4}>&nbsp;</Col>
          </Row>
          {counterBody}
        </Panel.Body>
      </Panel>
    );
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('UserCounter');
  if (domElement) { ReactDOM.render(<UserCounter />, domElement); }
});
