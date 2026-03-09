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
      .then((res) => setIsActive(res.otp_required_for_login))
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
  // http://localhost:3000/users/two_factor_auth/request_enable?jwt=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4LCJhY3Rpb24iOiJhY3RpdmF0ZV8yZmEiLCJleHAiOjE3NzMyMjM0ODN9.TlgJcZpaJ7O4Oyoyp-Ajxyv-XCa-GlQqQTbQQa2SyDg
  const cardBodyContent = () => {
    if (isActive === null) {
      return <p>Loading...!</p>;
    } if (isActive) {
      return (
        <>
          <Row>
            <Col xs={9} className="offset-3">
              <p className="form-text text-muted">
                Two-factor authentication (2FA) adds an extra layer of security to your account.
                Click below to request an email to disable 2FA.
              </p>
            </Col>
          </Row>
          <Row>
            <Col xs={9} className="offset-3">
              <Button variant="danger" onClick={enable2FA}>Disable 2FA</Button>
            </Col>
          </Row>
        </>
      );
    }
    return (
      <>
        <Row>
          <Col xs={9} className="offset-3">
            <p className="form-text text-muted">
              Two-factor authentication (2FA) adds an extra layer of security to your account.
              Click below to request an email to enable 2FA.
            </p>
          </Col>
        </Row>
        <Row>
          <Col xs={9} className="offset-3">
            <Button variant="success" onClick={enable2FA}>Request 2FA</Button>
          </Col>
        </Row>
      </>
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
