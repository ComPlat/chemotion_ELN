/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import { Panel, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

function OmniauthCredential() {
  const notify = (_params) => {
    NotificationActions.add({
      title: _params.title, message: _params.msg, level: _params.lvl, position: 'tc', dismissible: 'button', uid: uuid.v4()
    });
  };

  const [providers, setProviders] = useState(() => {
    UsersFetcher.fetchUserOmniauthProviders().then((json) => {
      const userProviders = (json?.current_user?.providers) || {};

      setProviders(userProviders);
    }).catch((err) => notify({ title: 'Fetch User Providers Error', lvl: 'error', msg: err }));
    return (providers);
  });

  let omniauthProviders = (<span />);

  if (typeof omniauthProviders !== 'undefined' && omniauthProviders !== null) {
    omniauthProviders = providers && Object.keys(providers).map((key) => (
      <Row key={uuid.v1()}>
        <Col key={uuid.v1()} md={2} />
        <Col key={uuid.v1()} md={5}>{key}</Col>
        <Col key={uuid.v1()} md={5}>{providers[key]}</Col>
      </Row>
    ));
  }

  return (
    <Panel>
      <Panel.Heading><Panel.Title>3rd-Party Credential</Panel.Title></Panel.Heading>
      <Panel.Body>
        {omniauthProviders}
        <br />
      </Panel.Body>
    </Panel>
  );
}

export default OmniauthCredential;
