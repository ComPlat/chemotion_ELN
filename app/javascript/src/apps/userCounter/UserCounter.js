import React, { Component } from 'react';
import {
  Card, Table, Button, Form, Alert
} from 'react-bootstrap';

import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import UserActions from 'src/stores/alt/actions/UserActions';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';

class UserCounter extends Component {
  constructor(props) {
    super(props);
    this.state = { currentUser: null, klasses: [], successMessage: null };
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

  handleCounterChange(key, value) {
    const { currentUser } = this.state;
    const counters = (currentUser && currentUser.counters) || {};
    counters[key] = value;
    currentUser.counters = counters;
    this.setState({ currentUser });
  }

  handleUpdate(type) {
    const { currentUser } = this.state;
    const counters = (currentUser && currentUser.counters) || {};
    UsersFetcher.updateUserCounter({
      type,
      counter: counters[type] || 0,
    })
      .then(() => {
        this.setState({ successMessage: 'Settings updated successfully!' });
        setTimeout(() => this.setState({ successMessage: '' }), 3000);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({ currentUser: state.currentUser });
      this.fetchKlasses();
    }
  }

  fetchKlasses() {
    GenericElsFetcher.fetchElementKlasses().then((result) => {
      const genericEntities = result && result.klass.filter((u) => u.is_generic === true);
      this.setState({ klasses: genericEntities || [] });
    });
  }

  render() {
    const { currentUser, klasses = [], successMessage } = this.state;
    if (klasses.length === 0) return null;

    const counterBody = klasses
      .filter((k) => k.is_active === true)
      .map((klass) => {
        const counter = parseInt((currentUser && currentUser.counters[klass.name]) || 0, 10);
        const nextNum = `${currentUser && currentUser.initials}-${klass.klass_prefix}${counter + 1}`;
        return (
          <tr key={klass.id} className="align-middle">
            <td>{klass.label}</td>
            <td>{klass.klass_prefix}</td>
            <td>
              <Form.Control
                type="number"
                value={counter}
                onChange={(e) => this.handleCounterChange(klass.name, e.target.value)}
                min={0}
              />
            </td>
            <td>{nextNum}</td>
            <td>
              <Button
                variant="primary"
                onClick={() => this.handleUpdate(klass.name)}
              >
                Update counter
              </Button>
            </td>
          </tr>
        );
      });

    return (
      <Card>
        <Card.Header>
          Element Counter
        </Card.Header>
        <Card.Body>
          <Table bordered responsive>
            <thead>
              <tr>
                <th>Element Label</th>
                <th>Prefix</th>
                <th>Counter starts at</th>
                <th>Next Label</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {counterBody}
            </tbody>
          </Table>
          {successMessage && (
          <Alert variant="success">
            {successMessage}
          </Alert>
          )}
        </Card.Body>
      </Card>
    );
  }
}

export default UserCounter;
