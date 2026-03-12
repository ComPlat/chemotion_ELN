import React, {
  useState, useEffect, useCallback, useMemo
} from 'react';
import PropTypes from 'prop-types';
import {
  Container, Card, Row, Col, Form, Button, Alert
} from 'react-bootstrap';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import InventoryLabelSettings from 'src/apps/settings/InventoryLabelSettings';
import ScifinderCredential from 'src/apps/scifinderCredential/ScifinderCredential';
import UserSetting from 'src/components/structureEditor/UserSetting';
import OmniauthCredential from 'src/apps/omniauthCredential/OmniauthCredential';
import UserCounter from 'src/apps/userCounter/UserCounter';
import { TwoFactorSettings } from 'src/apps/userSettings/TwoFA';
import { AccountSettings, DeleteSettings } from 'src/apps/userSettings/UserSettings';
import Affiliations from 'src/apps/userSettings/Affiliations';

function AccountProfile({ currentUser, closeSettings }) {
  const [reactionPrefix, setReactionPrefix] = useState(currentUser.reaction_name_prefix || '');
  const [reactionsCount, setReactionsCount] = useState(currentUser.counters?.reactions || 0);
  const [curation, setCuration] = useState(currentUser.profile?.curation || 1);
  const [nextLabel, setNextLabel] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successPosition, setSuccessPosition] = useState(null);
  const [currentSettings, setCurrentSettings] = useState('account');

  const nextReactionLabelCounter = parseInt(reactionsCount, 10) + 1;
  const updatedNextReactionLabel = nextReactionLabelCounter.toString().padStart(3, '0');

  useEffect(() => {
    setNextLabel(`${currentUser.initials}-${reactionPrefix}${updatedNextReactionLabel}`);
  }, [currentUser, reactionPrefix, reactionsCount]);

  const handleUserSettingsSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const payload = {
        reactions_count: parseInt(reactionsCount, 10),
        reaction_name_prefix: reactionPrefix,
      };

      UsersFetcher.updateReactionShortLabel(payload)
        .then(() => {
          setSuccessMessage('Settings updated successfully!');
          setSuccessPosition('reaction');
        })
        .catch((error) => {
          console.error('Error updating reaction label:', error);
        });
    },
    [reactionPrefix, reactionsCount]
  );

  const handleProfileSubmit = useCallback((e) => {
    e.preventDefault();

    const payload = {
      curation, // or whatever key your API expects (e.g., `curation_standard`)
    };

    UsersFetcher.updateUserProfile(payload)
      .then(() => {
        setSuccessMessage('Settings updated successfully!');
        setSuccessPosition('curation');
      })
      .catch((error) => {
        console.error('Failed to update profile:', error);
      });
  }, [curation]);

  const curations = {
    'No curation standard': 1,
    'Curation standard I: experimental organic chemistry': 2,
  };

  const accountSettings = () => (
    <Container className="my-3 d-flex flex-column gap-3">
      <AccountSettings currentUser={currentUser} />
      <TwoFactorSettings />
      <DeleteSettings />
    </Container>
  );

  const profileSettings = () => (
    <Container className="my-3 d-flex flex-column gap-3">
      {currentUser.allocated_space > 0 && (
        <Card>
          <Card.Header>Quota</Card.Header>
          <Card.Body>
            <Row className="mb-3">
              <Col className="col-3 offset-3 col-form-label">
                Used Space / Allocated Space
              </Col>
              <Col>
                {`${(currentUser.used_space / 1024 / 1024).toFixed(2)} MB / ${
                  (currentUser.allocated_space / 1024 / 1024).toFixed(2)} MB`}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header>Reaction Label</Card.Header>
        <Card.Body>
          <Form onSubmit={handleUserSettingsSubmit}>
            <Form.Control
              type="hidden"
              name="initials"
              value={currentUser.initials}
            />

            <Row className="mb-3">
              <Form.Label column className="col-form-label col-3 offset-3">
                Counter prefix
              </Form.Label>
              <Col className="col-2">
                <Form.Control
                  id="reaction-name-prefix"
                  maxLength={3}
                  value={reactionPrefix}
                  onChange={(e) => setReactionPrefix(e.target.value)}
                />
              </Col>
            </Row>

            <Row className="mb-3">
              <Form.Label column className="col-form-label col-3 offset-3">
                Counter starts at
              </Form.Label>
              <Col className="col-2">
                <Form.Control
                  type="number"
                  id="reactions-count"
                  min={0}
                  value={reactionsCount}
                  onChange={(e) => setReactionsCount(e.target.value)}
                />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col className="col-3 offset-3">
                <Form.Label className="col-form-label">Next reaction label will be:</Form.Label>
                <span>
                  {' '}
                  {nextLabel}
                </span>
              </Col>
            </Row>

            <Row>
              <Col className="offset-8">
                <Button type="submit" variant="primary">Update user settings</Button>
              </Col>
            </Row>
          </Form>
          {successMessage && successPosition === 'reaction' && (
            <Alert variant="success">
              {successMessage}
            </Alert>
          )}
        </Card.Body>
      </Card>

      <InventoryLabelSettings />

      <Card>
        <Card.Header>Curation</Card.Header>
        <Card.Body>
          <Form onSubmit={handleProfileSubmit}>
            <Row className="mb-3">
              <Form.Label column className="col-form-label col-3 offset-3">
                Curation Standard
              </Form.Label>
              <Col className="col-4">
                <Form.Select
                  value={curation}
                  onChange={(e) => setCuration(parseInt(e.target.value, 10))}
                >
                  {Object.entries(curations).map(([label, value]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            <Row>
              <Col className="offset-8">
                <Button type="submit" variant="primary">Update user profiles</Button>
              </Col>
            </Row>
          </Form>
          {successMessage && successPosition === 'curation' && (
            <Alert variant="success">
              {successMessage}
            </Alert>
          )}
        </Card.Body>
      </Card>
      <UserSetting />
      <UserCounter />
    </Container>
  );

  const externalSettings = () => (
    <Container className="my-3 d-flex flex-column gap-3">

      <ScifinderCredential />

      <OmniauthCredential />

    </Container>
  );

  const affiliationsSettings = () => (
    <Container className="my-3 d-flex flex-column gap-3">
      <Affiliations />
    </Container>
  );

  const renderMain = () => {
    if (currentSettings === 'account') {
      return accountSettings();
    }
    if (currentSettings === 'profile') {
      return profileSettings();
    }
    if (currentSettings === 'external') {
      return externalSettings();
    }
    if (currentSettings === 'affiliations') {
      return affiliationsSettings();
    }
  };

  const buttonStyle = useMemo(() => ({
    all: 'unset', // removes margin, padding, border, background
    cursor: 'pointer', // make it clear it’s clickable
    display: 'block', // full width
    width: '100%',
    padding: '2px', // optional for hit area
  }), []);

  return (
    <div className="container-fluid d-flex flex-column" style={{ minHeight: '100vh' }}>
      <div
        className="bg-light"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5
        }}
      >
        <h1 style={{
          display: 'inline',
        }}
        >
          Settings
        </h1>

        <Button variant="outline-dark" onClick={closeSettings} className="m-2 mb-4 float-end" size="sm">X</Button>
      </div>
      <div className="row flex-grow-1">
        {/* Left column: stretch to bottom */}
        <div
          className="col-2 bg-light d-flex flex-column"
          style={{ minHeight: '100%' }}
        >

          <ul className="list-unstyled p-3">
            <li>
              <button type="button" style={buttonStyle} onClick={() => setCurrentSettings('account')}>Account</button>
            </li>
            <li>
              <button type="button" style={buttonStyle} onClick={() => setCurrentSettings('profile')}>Profile</button>
            </li>
            <li>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => setCurrentSettings('external')}
              >
                3rd-party apps & SciFinder
              </button>
            </li>
            <li>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => setCurrentSettings('affiliations')}
              >
                Affiliations
              </button>
            </li>
          </ul>
        </div>
        <Col>
          {renderMain()}
        </Col>
      </div>

      <script src="/assets/pages.js" />
    </div>
  );
}

AccountProfile.propTypes = {
  closeSettings: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    initials: PropTypes.string.isRequired,
    used_space: PropTypes.number.isRequired,
    allocated_space: PropTypes.number.isRequired,
    reaction_name_prefix: PropTypes.string.isRequired,
    counters: PropTypes.shape({
      reactions: PropTypes.number.isRequired,
    }).isRequired,
    profile: PropTypes.shape({
      curation: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
};

export default AccountProfile;
