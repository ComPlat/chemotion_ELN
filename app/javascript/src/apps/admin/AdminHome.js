import React from 'react';
import {
  Row, Col, Nav, NavItem, Container, Dropdown
} from 'react-bootstrap';
import BaseNavigation from 'src/components/navigation/BaseNavigation';
import Notifications from 'src/components/Notifications';
import AdminDashboard from 'src/apps/admin/AdminDashboard';
import UserManagement from 'src/apps/admin/UserManagement';
import GroupsDevices from 'src/apps/admin/GroupsDevices';
import MessagePublish from 'src/apps/admin/MessagePublish';
import OlsTerms from 'src/apps/admin/OlsTerms';
import MatrixManagement from 'src/apps/admin/MatrixManagement';
import TextTemplateContainer from 'src/apps/admin/textTemplates/TextTemplateContainer';
import DelayedJobs from 'src/apps/admin/DelayedJobs';
import ChemSpectraLayouts from 'src/apps/admin/ChemSpectraLayouts';
import DevicesList from 'src/apps/admin/devices/DevicesList';
// import TemplateManagement from 'src/apps/admin/TemplateManagement';
import ThirdPartyApp from 'src/apps/admin/ThirdPartyApp';
import { IntlProvider, FormattedMessage } from 'react-intl';
import I18NFetcher from 'src/fetchers/I18NFetcher';

const LOCALES = ['en', 'de'];
const DEFAULT_LOCALE = 'en';

class AdminHome extends React.Component {
  constructor(props) {
    super();
    this.state = {
      pageIndex: 0,
      locale: DEFAULT_LOCALE,
      messages: null,
    };
    this.handleSelect = this.handleSelect.bind(this);
    this.handleLocaleSelect = this.handleLocaleSelect.bind(this);
  }

  componentDidMount() {
    this.fetchMessages();
  }

  handleSelect(pageIndex) {
    this.setState({
      pageIndex: Number(pageIndex)
    });
  }

  handleLocaleSelect(locale) {
    if (locale) this.setState({ locale });
  }

  getMessages() {
    const { locale, messages } = this.state;
    if (!messages) return null;
    const fallback = messages[DEFAULT_LOCALE] || {};
    if (locale === DEFAULT_LOCALE) return fallback;
    return { ...fallback, ...(messages[locale] || {}) };
  }

  getLanguageName(code) {
    const { messages } = this.state;
    return (messages && messages[code] && messages[code][`language-${code}`]) || code;
  }

  fetchMessages() {
    const requests = LOCALES.flatMap((locale) => [
      I18NFetcher.fetchGeneralMessages(locale),
      I18NFetcher.fetchAdminMessages(locale),
    ]);
    Promise.all(requests).then((results) => {
      const messages = {};
      LOCALES.forEach((locale, index) => {
        const general = results[index * 2];
        const admin = results[index * 2 + 1];
        messages[locale] = { ...general, ...admin };
      });
      this.setState({ messages });
    });
  }

  mainContent() {
    const { pageIndex } = this.state;
    switch (pageIndex) {
      case 0: return <AdminDashboard />;
      case 1: return <UserManagement />;
      case 2: return <MessagePublish />;
      case 4: return <GroupsDevices />;
      case 5: return <OlsTerms />;
      case 7: return <MatrixManagement />;
      case 8: return <TextTemplateContainer />;
      case 9: return <DevicesList />;
      // case 12: return <TemplateManagement />;
      case 13: return <DelayedJobs />;
      case 14: return <ChemSpectraLayouts />;
      case 15: return <ThirdPartyApp />;
      default: return null;
    }
  }

  renderLocaleSwitch() {
    const { locale } = this.state;
    return (
      <div className="d-grid">
        <Dropdown onSelect={this.handleLocaleSelect}>
          <Dropdown.Toggle variant="primary" className="w-100">
            {this.getLanguageName(locale)}
          </Dropdown.Toggle>
          <Dropdown.Menu className="w-100">
            {LOCALES.map((code) => (
              <Dropdown.Item key={code} eventKey={code} active={code === locale}>
                {this.getLanguageName(code)}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
    );
  }

  renderTree() {
    const { pageIndex } = this.state;

    return (
      <div className="d-flex flex-column gap-3 mt-2">
        {this.renderLocaleSwitch()}
        <Nav className="flex-column fs-5 gap-3" variant="pills" activeKey={pageIndex} onSelect={this.handleSelect}>
          <NavItem>
            <Nav.Link eventKey={0}>
              <FormattedMessage id="navigation-dashboard" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={1}>
              <FormattedMessage id="navigation-user_management" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={9}>
              <FormattedMessage id="navigation-devices" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={4}>
              <FormattedMessage id="navigation-groups" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={7}>
              <FormattedMessage id="navigation-UI_features" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={8}>
              <FormattedMessage id="navigation-text_templates" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={2}>
              <FormattedMessage id="navigation-message_publish" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={5}>
              <FormattedMessage id="navigation-load_OLS_terms" />
            </Nav.Link>
          </NavItem>
          {/* <NavItem>
            <Nav.Link eventKey={12}>Report-template Management</Nav.Link>
          </NavItem> */}
          <NavItem>
            <Nav.Link eventKey={13}>
              <FormattedMessage id="navigation-delayed_jobs" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={14}>
              <FormattedMessage id="navigation-ChemSpectra_layouts" />
            </Nav.Link>
          </NavItem>
          <NavItem>
            <Nav.Link eventKey={15}>
              <FormattedMessage id="navigation-third_party_apps" />
            </Nav.Link>
          </NavItem>
        </Nav>
      </div>
    );
  }

  render() {
    const { locale } = this.state;
    const messages = this.getMessages();
    if (!messages || Object.keys(messages).length === 0) {
      return null;
    }
    return (
      <IntlProvider messages={messages} locale={locale} defaultLocale={DEFAULT_LOCALE}>
        <div>
          <Container fluid>
            <Row className="mb-3">
              <BaseNavigation />
            </Row>
            <div className="d-flex gap-4">
              {this.renderTree()}
              <div className="flex-grow-1">
                {this.mainContent()}
              </div>
            </div>
            <Row>
              <Col>
                <Notifications />
              </Col>
            </Row>
          </Container>
        </div>
      </IntlProvider>
    );
  }
}

export default AdminHome;
