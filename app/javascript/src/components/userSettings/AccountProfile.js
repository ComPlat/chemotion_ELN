import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {  Container, Modal } from 'react-bootstrap';
import ScifinderCredential from 'src/components/userSettings/ScifinderCredential';
import OmniauthCredential from 'src/apps/omniauthCredential/OmniauthCredential';
import TreeViewItem from 'src/components/common/TreeViewItem';
import AuthToken from 'src/components/userSettings/AuthToken';
import { TwoFactorSettings } from 'src/components/userSettings/TwoFA';
import { AccountSettings, DeleteSettings } from 'src/components/userSettings/UserSettings';
import Affiliations from 'src/components/userSettings/Affiliations';
import TextTemplates from 'src/components/userSettings/TextTemplates';
import Profile from 'src/components/userSettings/Profile';

const AuthenticationSettings = ({ currentUser }) => (
    <Container className="my-3 d-flex flex-column gap-3">
      <AccountSettings currentUser={currentUser} />
      <TwoFactorSettings />
      <AuthToken currentUser={currentUser} />
      <DeleteSettings />
    </Container>
  );

AuthenticationSettings.propTypes = {
  currentUser: PropTypes.shape({
    email: PropTypes.string.isRequired,
    unconfirmed_email: PropTypes.string.isRequired,
  }).isRequired,
};

const ExternalSettings = () => (
    <Container className="my-3 d-flex flex-column gap-3">
      <ScifinderCredential />
      <OmniauthCredential />
    </Container>
  );

const AccountProfile = ({ currentUser, closeSettings }) => {
  const [currentSettings, setCurrentSettings] = useState('account');

  const renderMain = () => {
    if (currentSettings === 'account') {
      return <AuthenticationSettings currentUser={currentUser} />;
    }
    if (currentSettings === 'profile') {
      return <Profile currentUser={currentUser} />;
    }
    if (currentSettings === 'external') {
      return <ExternalSettings />;
    }
    if (currentSettings === 'affiliations') {
      return <Affiliations />;
    }
    if (currentSettings === 'text-templates') {
      return <TextTemplates />;
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
};

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
