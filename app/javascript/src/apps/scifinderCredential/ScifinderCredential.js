import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Row, Col } from 'react-bootstrap';
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
    uid: uuid.v4(),
  });
};

const POLL_INTERVAL_MS = 5_000; // 10 sec
const POLL_TIMEOUT_MS = 60_000; // 1 min

const ScifinderCredential = () => {
  const [credential, setCredential] = useState({});
  const [isPolling, setIsPolling] = useState(false);

  const pollRef = useRef({
    intervalId: null,
    timeoutId: null,
    initialToken: null,
  });

  const clearPollingTimers = () => {
    if (pollRef.current.intervalId) {
      clearInterval(pollRef.current.intervalId);
      pollRef.current.intervalId = null;
    }
    if (pollRef.current.timeoutId) {
      clearTimeout(pollRef.current.timeoutId);
      pollRef.current.timeoutId = null;
    }
  };

  const stopPolling = () => {
    clearPollingTimers();
    setIsPolling(false);
    pollRef.current.initialToken = null;
  };

  const fetchCredential = () =>
    UsersFetcher.scifinderCredential()
      .then((json) => {
        setCredential(json);
        return json;
      })
      .catch((err) => {
        notify({ title: 'SciFinder-n Error', lvl: 'error', msg: err });
        throw err;
      });

  useEffect(() => {
    fetchCredential();

    // Cleanup on unmount.
    return () => {
      clearPollingTimers();
    };
  }, []);

  const startPollingForNewToken = ({ initialToken }) => {
    stopPolling();
    setIsPolling(true);
    pollRef.current.initialToken = initialToken || null;

    // Poll every x seconds.
    pollRef.current.intervalId = setInterval(() => {
      UsersFetcher.scifinderCredential()
        .then((json) => {
          const newToken = json?.access_token;
          const oldToken = pollRef.current.initialToken;

          // "New token arrived" = we got a non-empty token different from the initial one.
          if (newToken && newToken !== oldToken) {
            setCredential(json);
            stopPolling();
            notify({
              title: 'SciFinder-n',
              lvl: 'success',
              msg: 'New access token received.',
            });
          }
        })
        .catch((err) => notify({ title: 'SciFinder-n Error', lvl: 'error', msg: err }));
    }, POLL_INTERVAL_MS);

    // Hard stop at 1 minute.
    pollRef.current.timeoutId = setTimeout(() => {
      stopPolling();
      notify({
        title: 'SciFinder-n',
        lvl: 'warning',
        msg: 'Timed out waiting for a new token (60s). If you completed auth, try again.',
      });
    }, POLL_TIMEOUT_MS);
  };

  const onGetTokenClick = () => {
    const authUrl = `${window.location.origin}/users/auth/oauth2`;

    const popup = window.open(
      authUrl,
      'scifinder_oauth',
      'width=600,height=750'
    );

    if (!popup) {
      notify({
        title: 'SciFinder-n',
        lvl: 'error',
        msg: 'Popup blocked. Please allow popups for this site and try again.',
      });
      return;
    }

    startPollingForNewToken({ initialToken: credential?.access_token });
  };

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
              onClick={onGetTokenClick}
              disabled={isPolling}
              variant="primary"
            >
              {isPolling ? 'Waiting for token…' : 'Get token'}
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ScifinderCredential;
