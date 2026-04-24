import React, { useEffect, useState, useCallback } from 'react';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import {
  Card, Button, Row, Col, Alert
} from 'react-bootstrap';

function TwoFactorSettings() {
  const [isActive, setIsActive] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    UsersFetcher.fetch2FAQR()
      .then((res) => setIsActive(res.otp_required_for_login ?? false))
      .catch((err) => console.error(err));
  }, []);

  const enable2FA = useCallback(() => {
    UsersFetcher.fetchEnable2FAQR()
      .then((res) => {
        if (res.success) {
          setMessage('Email has been sent!');
        } else {
          setMessage('The email could not be sent!');
        }
      })
      .catch((err) => console.error(err.response.error));
  });

  const cardBodyContent = () => {
    if (isActive === null) {
      return <p>Loading...!</p>;
    } if (isActive) {
      return (
        <Row>
          <Col xs={3}>
            <Button variant="danger" onClick={enable2FA}>Disable 2FA</Button>
          </Col>
          <Col xs={9}>
            <p>
              Two-factor authentication (2FA) adds an extra layer of security to your account.
              Click below to request an email to disable 2FA.
            </p>
          </Col>
        </Row>
      );
    }
    return (
      <Row>
        <Col xs={3}>
          <Button variant="success" onClick={enable2FA}>Request 2FA</Button>
        </Col>
        <Col xs={9}>
          <p>
            Two-factor authentication (2FA) adds an extra layer of security to your account.
            Click below to request an email to enable 2FA.
          </p>
        </Col>
      </Row>
    );
  };

  return (
    <Card>
      <Card.Header>Enable Two-Factor Authentication</Card.Header>
      <Card.Body>
        {message && <Alert variant="info">{message}</Alert>}
        {cardBodyContent()}
      </Card.Body>
    </Card>
  );
}

export {
  TwoFactorSettings
};
