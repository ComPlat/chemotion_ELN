import {
  Alert, Button, Card, Col, Form, Row, Modal, InputGroup, Table
} from 'react-bootstrap';
import React, { useState, useCallback, useEffect } from 'react';
import UsersFetcher from 'src/fetchers/UsersFetcher';

function AuthToken({ currentUser }) {
  const [show, setShow] = useState(false);
  const [lastToken, setLastToken] = useState(null);
  const [user, setUser] = useState(currentUser);

  const handleClose = useCallback(() => setShow(false), []);
  const handleShow = useCallback(() => setShow(true), []);

  const updateUser = async () => {
    const newUser = await UsersFetcher.fetchCurrentUser();
    setUser(newUser.user);
  };

  const handleOnRevoke = useCallback((token) => {
    UsersFetcher.fetchRevokeAuthTokens(token)
      .then((res) => {
        updateUser();
      })
      .catch((error) => {
        console.error('Failed to create Auth token:', error);
        if (error.status === 401) {
          setErrorMessage('Incorrect password. Please try again.');
        }
      });
  }, []);

  useEffect(() => {
    if (lastToken) {
      updateUser();
    }
  }, [lastToken]);

  return (
    <>
      <AuthTokenCard
        handleShow={handleShow}
        lastToken={lastToken}
        currentTokens={user.tokens}
        onRevoke={handleOnRevoke}
      />
      <AuthTokenFormModal
        show={show}
        handleClose={handleClose}
        setLastToken={setLastToken}
      />
    </>
  );
}

function AuthTokenCard({
  handleShow, lastToken, currentTokens, onRevoke
}) {
  const copyToClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastToken)
        .then(() => {
          console.log('Token copied!');
        })
        .catch(() => {
          console.error('Failed to copy token.');
        });
    } else {
      // Fallback: older browsers
      const textArea = document.createElement('textarea');
      textArea.value = lastToken;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('Token copied!');
      } catch {
        console.error('Failed to copy token.');
      }
      document.body.removeChild(textArea);
    }
  };

  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    if (lastToken) {
      setShowAlert(true);
    }
  }, [lastToken]);
  return (
    <Card>
      <Card.Header>Authentification Token</Card.Header>

      <Card.Body>
        {lastToken && showAlert && (
          <Alert variant="success" className="mt-3" dismissible onClose={() => setShowAlert(false)}>
            <p>The token may only be shown once. Make sure to copy and store it securely.</p>
            <InputGroup>
              <Form.Control readOnly value={lastToken} />
              <Button variant="outline-secondary" onClick={copyToClipboard}>
                Copy
              </Button>
            </InputGroup>
          </Alert>
        )}
        <Row>
          <Col xs={8}>
            <p>
              Generate a new authentication token for secure access.
              Tokens are sensitive credentials and should be stored securely.
            </p>
          </Col>
          <Col xs={4}>
            <Button variant="primary" onClick={handleShow}>
              New Auth token
            </Button>
          </Col>
        </Row>
        <TokenList tokens={currentTokens} onRevoke={onRevoke} />
      </Card.Body>
    </Card>
  );
}

function AuthTokenFormModal({
  handleClose, show, setLastToken
}) {
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [expireInDays, setExpireInDays] = useState(2);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePassword = useCallback((e) => setPass(e.target.value), []);
  const handleName = useCallback((e) => setName(e.target.value), []);

  const handleExpireInDays = useCallback((e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0 && val < 600) {
      setExpireInDays(val);
    }
  }, []);

  const handleUserSettingsSubmit = useCallback((e) => {
    e.preventDefault();

    const payload = {
      expires_in_days: expireInDays, name
    };

    UsersFetcher.fetchNewAuthToken(payload)
      .then((res) => {
        setLastToken(res.token);
        handleClose();
        setErrorMessage('');
      })
      .catch((error) => {
        console.error('Failed to create Auth token:', error);
        if (error.status === 401) {
          setErrorMessage('Incorrect password. Please try again.');
        }
      });
  }, [pass, expireInDays, name]);

  useEffect(() => {
    setPass('');
    setName('');
    setErrorMessage('');
  }, [show]);

  return (
    <Modal show={show} onHide={handleClose}>
      <Form onSubmit={handleUserSettingsSubmit}>
        <Modal.Header>New authentification token</Modal.Header>

        <Modal.Body>
          <p>
            An authentication token is used to securely access the API and related services.
            This token acts as a password and should be treated as confidential information.
          </p>
          <ul>
            <li>Do not share your token publicly.</li>
            <li>Store it securely (e.g., environment variables or secure vault).</li>
          </ul>
          <p>
            After generation, the token may only be shown once. Make sure to copy and store it securely.
          </p>
          {errorMessage && (
            <Alert variant="danger">
              {errorMessage}
            </Alert>
          )}
          <Row className="mb-3">
            <Form.Label column className="col-form-label col-3">
              Token name
            </Form.Label>
            <Col className="col-9">
              <Form.Control
                id="auth-token-name"
                value={name}
                onChange={handleName}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Form.Label column className="col-form-label col-3">
              Expire in days (1 - 600)
            </Form.Label>
            <Col className="col-9">
              <Form.Control
                type="number"
                min={1}
                max={600}
                id="auth-token-expire"
                value={expireInDays}
                isInvalid={expireInDays < 1 || expireInDays > 600}
                onChange={handleExpireInDays}
              />
            </Col>
          </Row>

        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button type="submit" variant="primary">Generate token</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function TokenList({ tokens, onRevoke }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // if UNIX seconds
    const diffMs = date - new Date();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${date.toLocaleString()} (${diffDays} ${diffDays === 1 ? 'day' : 'days'})`;
  };

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Name</th>
          <th>Expires</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token) => (
          <tr className={token.revoked ? 'revoked-auth-token' : ''} key={`${token.name}-${token.expiration_date}`}>
            <td>
              {token.name}
            </td>

            <td>{formatDate(token.expiration_date)}</td>
            <td>
              {!token.revoked
                ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRevoke(token)}
                  >
                    Revoke
                  </Button>
                ) : <b>REVOKED</b>}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export {
  AuthToken
};
