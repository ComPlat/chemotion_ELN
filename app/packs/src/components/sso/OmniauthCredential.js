/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Button, Panel, Row, Col } from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import UsersFetcher from '../fetchers/UsersFetcher';
import NotificationActions from '../actions/NotificationActions';

const OmniauthCredential = () => {
  const [provider, setProvider] = useState('');
  const notify = (_params) => {
    NotificationActions.add({
      title: _params.title, message: _params.msg, level: _params.lvl, position: 'tc', dismissible: 'button', uid: uuid.v4()
    });
  };

  const [providers, setProviders] = useState(() => {
    UsersFetcher.fetchUserOmniauthProviders().then((json) => {
      const options = json.providers.map(op => ({ value: op, name: op, label: op }));
      const currentProvider = (json && json.current_user && json.current_user.omniauth_provider) || '';

      setProviders({ options, currentProvider });
    }).catch(err => notify({ title: 'Fetch User Providers Error', lvl: 'error', msg: err }));
    return (providers);
  });

  return (
    <Panel>
      <Panel.Heading><Panel.Title>3rd-Party Credential</Panel.Title></Panel.Heading>
      <Panel.Body>
        <Row>
          <Col sm={2}><b style={{ float: 'right' }}>Current provider is</b></Col>
          <Col sm={2}>{providers && providers.currentProvider}</Col>
          <Col sm={2}><b style={{ float: 'right' }}>Connect to</b></Col>
          <Col sm={2}>
            <Select
              onChange={e => setProvider(e.value)}
              menuContainerStyle={{ position: 'absolute' }}
              multi={false}
              options={providers && providers.options}
              value={provider}
            />
          </Col>
          <Col sm={4}><Button bsStyle="primary" href={`${window.location.origin}/users/auth/${provider}`}>Connect</Button></Col>
        </Row>
        <br />
      </Panel.Body>
    </Panel>
  );
};

export default OmniauthCredential;

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('OmniauthCredential');
  if (domElement) { ReactDOM.render(<OmniauthCredential />, domElement); }
});
