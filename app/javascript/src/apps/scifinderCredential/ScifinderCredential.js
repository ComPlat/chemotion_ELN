/* eslint-disable react/forbid-prop-types */
import React, { useState, useEffect } from 'react';
import { Button, Panel, Row, Col } from 'react-bootstrap';
import moment from 'moment';
import uuid from 'uuid';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const ScifinderCredential = () => {
  const [credential, setCredential] = useState({});
  const notify = (_params) => {
    NotificationActions.add({
      title: _params.title, message: _params.msg, level: _params.lvl, position: 'tc', dismissible: 'button', uid: uuid.v4()
    });
  };

  useEffect(() => {
    UsersFetcher.scifinderCredential().then((json) => {
      setCredential(json);
    }).catch(err => notify({ title: 'SciFinder-n Error', lvl: 'error', msg: err }));
  }, [credential.access_token]);

  return (
    <Panel>
      <Panel.Heading><Panel.Title>SciFinder-n Credential</Panel.Title></Panel.Heading>
      <Panel.Body>
        <Row>
          <Col sm={4}><b style={{ float: 'right' }}>Current token will expire at</b></Col>
          <Col sm={4}>
            {credential.expires_at ? `${moment(credential.expires_at).format('YYYY-MM-DD HH:mm:ss')} UTC` : ''}
          </Col>
          <Col sm={4}><Button bsStyle="primary" href={`${window.location.origin}/users/auth/oauth2`}>Get token</Button></Col>
        </Row>
      </Panel.Body>
    </Panel>
  );
};

export default ScifinderCredential;
