import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {
  Row,
  Col,
  Grid,
  Button
} from 'react-bootstrap';
import uuid from 'uuid';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';

export default class LoginOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      omniauthProviders: []
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchOmniauthProviders();
  }

  onChange(state) {
    const { omniauthProviders } = this.state;
    if (state?.omniauthProviders !== omniauthProviders) {
      this.setState({
        omniauthProviders: state.omniauthProviders
      });
    }
  }

  render() {
    const { omniauthProviders } = this.state;
    const keys = Object.keys(omniauthProviders);
    if (keys.length === 0) return (<span />);
    const items = keys.map((key) => (
      <Col key={uuid.v1()} md={12 / keys.length} className="login-options">
        <Button href={`/users/auth/${key}`}>
          Login with &nbsp;
          <img src={`/images/providers/${omniauthProviders[key].icon}`} className="kit-logo" alt={key} title={key} />
        </Button>
      </Col>
    ));

    return (
      <Grid>
        <Row>
          {items}
        </Row>
      </Grid>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('LoginOptions');
  if (domElement) { ReactDOM.render(<LoginOptions />, domElement); }
});
