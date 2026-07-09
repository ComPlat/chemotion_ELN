import React, { useState, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import {
  Container, Card, Row, Col, Form, Button, Alert, Modal
} from 'react-bootstrap';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import InventoryLabelSettings from 'src/apps/settings/InventoryLabelSettings';
import ScifinderCredential from 'src/apps/scifinderCredential/ScifinderCredential';
import UserSetting from 'src/components/structureEditor/UserSetting';
import OmniauthCredential from 'src/apps/omniauthCredential/OmniauthCredential';
import UserCounter from 'src/apps/userCounter/UserCounter';
import TreeViewItem from 'src/components/common/TreeViewItem';
import AuthToken from 'src/apps/userSettings/AuthToken';
import { TwoFactorSettings } from 'src/apps/userSettings/TwoFA';
import { AccountSettings, DeleteSettings } from 'src/apps/userSettings/UserSettings';
import Affiliations from 'src/apps/userSettings/Affiliations';
import TextTemplates from 'src/apps/userSettings/TextTemplates';
import LlmSettings from 'src/apps/userSettings/LlmSettings';

const AuthenticationSettings = ({ currentUser }) => {
  return (
    <Container className="my-3 d-flex flex-column gap-3">
      <AccountSettings currentUser={currentUser} />
      <TwoFactorSettings />
      <AuthToken currentUser={currentUser} />
      <DeleteSettings />
    </Container>
  );
}

AuthenticationSettings.propTypes = {
  currentUser: PropTypes.shape({
    email: PropTypes.string.isRequired,
    unconfirmed_email: PropTypes.string.isRequired,
  }).isRequired,
};

const ProfileSettings = ({ currentUser }) => {
  const [reactionPrefix, setReactionPrefix] = useState(currentUser.reaction_name_prefix || '');
  const [reactionsCount, setReactionsCount] = useState(currentUser.counters?.reactions || 0);
  const [inboxAuto, setInboxAuto] = useState(currentUser.profile?.data.inbox_auto !== false);
  const [inboxManual, setInboxManual] = useState(currentUser.profile?.data.inbox_manual);
  const [curation, setCuration] = useState(currentUser.profile?.curation || 1);
  const [successMessage, setSuccessMessage] = useState('');
  const [successPosition, setSuccessPosition] = useState(null);
  const nextReactionLabelCounter = parseInt(reactionsCount, 10) + 1;
  const updatedNextReactionLabel = nextReactionLabelCounter.toString().padStart(3, '0');
  const nextLabel = `${currentUser.initials}-${reactionPrefix}${updatedNextReactionLabel}`;

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

  const handleProfileInboxSubmit = useCallback((e) => {
    e.preventDefault();

    const autoChanged = inboxAuto !== (currentUser.profile?.data.inbox_auto !== false);
    const manualChanged = inboxManual !== currentUser.profile?.data.inbox_manual;
    if (autoChanged || manualChanged) {
      const payload = {
        data: {
          inbox_auto: inboxAuto,
          inbox_manual: inboxManual,
        }
      };

      UsersFetcher.updateUserProfile(payload)
        .then(() => {
          setSuccessMessage('Settings updated successfully!');
          setSuccessPosition('inbox');
        })
        .catch((error) => {
          console.error('Failed to update profile:', error);
        });
    }
  }, [inboxAuto, inboxManual, currentUser]);

  const handleProfileSubmit = useCallback((e) => {
    e.preventDefault();

    const payload = {
      curation,
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
  return (
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
        <Card.Header>Inbox to Element</Card.Header>
        <Card.Body>
          <Form onSubmit={handleProfileInboxSubmit}>
            <Row className="mb-3">
              <Form.Label column className="col-form-label col-3 offset-3">
                Enable Auto Transfer Inbox to Element (Sample, Reaction)
              </Form.Label>
              <Col className="col-4">
                <Form.Check
                  type="switch"
                  id="inbox_auto"
                  onChange={(e) => setInboxAuto(e.target.checked)}
                  checked={inboxAuto}
                />
              </Col>
            </Row>
            <Row className="mb-3">
              <Form.Label column className="col-form-label col-3 offset-3">
                Enable Manual Transfer Inbox to Element (Sample, Reaction)
              </Form.Label>
              <Col className="col-4">
                <Form.Check
                  type="switch"
                  id="inbox_manual"
                  onChange={(e) => setInboxManual(e.target.checked)}
                  checked={inboxManual}
                />
              </Col>
            </Row>

            <Row>
              <Col className="offset-8">
                <Button type="submit" variant="primary">Update user profiles</Button>
              </Col>
            </Row>
          </Form>
          {successMessage && successPosition === 'inbox' && (
          <Alert variant="success">
            {successMessage}
          </Alert>
          )}
        </Card.Body>
      </Card>

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
}

ProfileSettings.propTypes = {
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
      data: PropTypes.shape({
        inbox_auto: PropTypes.bool,
        inbox_manual: PropTypes.bool,
      })
    }).isRequired,
  }).isRequired,
};

const ExternalSettings = () => {
  return (
    <Container className="my-3 d-flex flex-column gap-3">

      <ScifinderCredential />

      <OmniauthCredential />

    </Container>
  );
}

const AffiliationsSettings = () => {
  return (
    <Container className="my-3 d-flex flex-column gap-3">
      <Affiliations />
    </Container>
  );
}

const AiSettings = () => {
  return (
    <Container className="my-3 d-flex flex-column gap-3">
      <LlmSettings />
    </Container>
  );
}

const AccountProfile = ({ currentUser, closeSettings }) => {
  const [currentSettings, setCurrentSettings] = useState('account');
  // AI/LLM Settings is shown only when the user is granted at least one AI access
  // gate (institution provider or personal API key). Hidden entirely otherwise.
  const [aiAllowed, setAiAllowed] = useState(false);

  useEffect(() => {
    UsersFetcher.fetchLlmAccess()
      .then((access) => setAiAllowed(!!access.any_allowed))
      .catch(() => setAiAllowed(false));
  }, []);

  const renderMain = () => {
    if (currentSettings === 'account') {
      return <AuthenticationSettings currentUser={currentUser} />;
    }
    if (currentSettings === 'profile') {
      return <ProfileSettings currentUser={currentUser} />;
    }
    if (currentSettings === 'external') {
      return <ExternalSettings />;
    }
    if (currentSettings === 'affiliations') {
      return <AffiliationsSettings />;
    }
    if (currentSettings === 'text-templates') {
      return <TextTemplates />;
    }
    if (currentSettings === 'ai' && aiAllowed) {
      return <AiSettings />;
    }
    return null;
  };

  return (
    <div className="account-profile w-100 h-100 d-flex flex-column">
      <Modal.Header
        className="account-profile__header"
        closeButton
        onHide={closeSettings}
      >
        <h4 className="ms-3">Settings</h4>
      </Modal.Header>
      <div className="d-flex flex-grow-1 align-items-stretch" style={{ minHeight: 0 }}>
        <div className="sidebar">
          <div className="sidebar-content">
            <div className="tree-view__container">
              <TreeViewItem
                title="Account"
                selected={currentSettings === 'account'}
                onClick={() => setCurrentSettings('account')}
              />
              <TreeViewItem
                title="Profile"
                selected={currentSettings === 'profile'}
                onClick={() => setCurrentSettings('profile')}
              />
              <TreeViewItem
                title="3rd-party apps & SciFinder"
                selected={currentSettings === 'external'}
                onClick={() => setCurrentSettings('external')}
              />
              <TreeViewItem
                title="Affiliations"
                selected={currentSettings === 'affiliations'}
                onClick={() => setCurrentSettings('affiliations')}
              />
              <TreeViewItem
                title="Text Templates"
                selected={currentSettings === 'text-templates'}
                onClick={() => setCurrentSettings('text-templates')}
              />
              {aiAllowed && (
                <TreeViewItem
                  title="AI/LLM Settings"
                  selected={currentSettings === 'ai'}
                  onClick={() => setCurrentSettings('ai')}
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
          {renderMain()}
        </div>
      </div>

      <script src="/assets/pages.js" />
    </div>
  );
}

AccountProfile.propTypes = {
  closeSettings: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    email: PropTypes.string.isRequired,
    unconfirmed_email: PropTypes.string.isRequired,
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
