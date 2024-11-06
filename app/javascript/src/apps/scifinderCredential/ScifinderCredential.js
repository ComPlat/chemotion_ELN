import React, { useState, useEffect } from 'react';
import {
  Button, Card, Row, Col
} from 'react-bootstrap';
import moment from 'moment';
import uuid from 'uuid';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const notify = ({ title, msg, lvl }) => {
  NotificationActions.add({
    title,
    message: msg,
    level: lvl,
    position: 'tc',
    dismissible: 'button',
    uid: uuid.v4()
  });
};

const ScifinderCredential = () => {
  const [credential, setCredential] = useState({});

  useEffect(() => {
    UsersFetcher.scifinderCredential().then((json) => {
      setCredential(json);
    }).catch((err) => notify({
      title: 'SciFinder-n Error',
      lvl: 'error',
      msg: err
    }));
  }, [credential.access_token]);

  return (
    <Card>
      <Card.Header>SciFinder-n Credential</Card.Header>
      <Card.Body>
        <Row>
          <Col xs={{ span: 3, offset: 3 }} className="fw-bold">Current token will expire at</Col>
          <Col xs={2}>
            {credential.expires_at
              ? `${moment(credential.expires_at).format('YYYY-MM-DD HH:mm:ss')} UTC`
              : '-'}
          </Col>
          <Col xs={3}>
            <Button
              variant="primary"
              href={`${window.location.origin}/users/auth/oauth2`}
            >
              Get token
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ScifinderCredential;
