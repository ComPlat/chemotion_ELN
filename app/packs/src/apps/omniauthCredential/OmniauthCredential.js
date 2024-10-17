import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const OmniauthCredential = () => {
  const notify = (_params) => {
    NotificationActions.add({
      title: _params.title,
      message: _params.msg,
      level: _params.lvl,
      position: 'tc',
      dismissible: 'button',
      uid: uuid.v4()
    });
  };

  const [providers, setProviders] = useState({});
  useEffect(async () => {
    try {
      const json = await UsersFetcher.fetchUserOmniauthProviders();
      const userProviders = (json?.current_user?.providers) || {};
      setProviders(userProviders);
    } catch (err) {
      notify({ title: 'Fetch User Providers Error', lvl: 'error', msg: err });
    }
  }, []);

  const omniauthProviders = Object.keys(providers).map((key) => (
    <Row key={key} className="mb-3">
      <Col xs={{ span: 5, offset: 2 }}>{key}</Col>
      <Col xs={5}>{providers[key]}</Col>
    </Row>
  ));

  return (
    <Card>
      <Card.Header>3rd-Party Credential</Card.Header>
      <Card.Body>
        {omniauthProviders.length > 0
          ? omniauthProviders
          : 'No omniauth providers configured'}
      </Card.Body>
    </Card>
  );
};

export default OmniauthCredential;
