import React from 'react';
import { Grid, Row, Col, Nav, NavItem } from 'react-bootstrap';
import AdminNavigation from 'src/apps/admin/AdminNavigation';
import Notifications from 'src/components/Notifications';
import AdminDashboard from 'src/apps/admin/AdminDashboard';
import UserManagement from 'src/apps/admin/UserManagement';
import GroupsDevices from 'src/apps/admin/GroupsDevices';
import MessagePublish from 'src/apps/admin/MessagePublish';
import DataCollector from 'src/apps/admin/DataCollector';
import OlsTerms from 'src/apps/admin/OlsTerms';
import NovncSettings from 'src/apps/admin/NovncSettings';
import MatrixManagement from 'src/apps/admin/MatrixManagement';
import TextTemplateContainer from 'src/apps/admin/textTemplates/TextTemplateContainer';
import DelayedJobs from 'src/apps/admin/DelayedJobs';
// import TemplateManagement from 'src/apps/admin/TemplateManagement';

class AdminHome extends React.Component {
  constructor(props) {
    super();
    this.state = {
      showTree: true,
      pageIndex: 0,
      contentClassName: 'small-col main-content',
    };
    this.toggleTree = this.toggleTree.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
  }

  toggleTree() {
    const { showTree } = this.state;
    this.setState({
      showTree: !showTree,
      contentClassName: showTree ? 'small-col full-main' : 'small-col main-content'
    });
  }

  handleSelect(pageIndex) {
    this.setState({
      pageIndex
    });
  }


  mainContent() {
    const { pageIndex } = this.state;
    if (pageIndex === 0) {
      return this.renderDashboard();
    } else if (pageIndex === 1) {
      return this.renderUserManagement();
    } else if (pageIndex === 2) {
      return this.renderMessagePublish();
    } else if (pageIndex === 3) {
      return this.renderDataCollector();
    } else if (pageIndex === 4) {
      return this.renderGroupMgnt();
    } else if (pageIndex === 5) {
      return this.renderOlsTerms();
    } else if (pageIndex === 6) {
      return this.renderNovncSettings();
    } else if (pageIndex === 7) {
      return this.renderContent(<MatrixManagement />);
    } else if (pageIndex === 8) {
      return this.renderTextTemplates();
    } else if (pageIndex === 12) {
      return this.renderTemplateManagement();
    } else if (pageIndex === 13) {
      return this.renderDelayedJobs();
    }
    return (<div />);
  }

  tree() {
    const { showTree, pageIndex } = this.state;
    if (!showTree) {
      return <div />;
    }

    return (
      <div>
        <Col className="small-col collec-tree">
          <Nav bsStyle="pills" stacked activeKey={pageIndex} onSelect={this.handleSelect}>
            <NavItem eventKey={0}>Dashboard</NavItem>
            <NavItem eventKey={1}>User Management</NavItem>
            <NavItem eventKey={4}>Groups &amp; Devices</NavItem>
            <NavItem eventKey={3}>Data Collector</NavItem>
            <NavItem eventKey={6}>NoVNC Settings</NavItem>
            <NavItem eventKey={7}>UI features</NavItem>
            <NavItem eventKey={8}>Text Templates</NavItem>
            <NavItem eventKey={2}>Message Publish</NavItem>
            <NavItem eventKey={5}>Load OLS Terms</NavItem>
	    {/* <NavItem eventKey={12}>Report-template Management</NavItem> */}
            <NavItem eventKey={13}>Delayed Jobs </NavItem>
          </Nav>
        </Col>
      </div>
    );
  }

  renderDashboard() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <AdminDashboard />
      </Col>
    );
  }

  renderUserManagement() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <UserManagement />
      </Col>
    );
  }

  renderMessagePublish() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <MessagePublish />
      </Col>
    );
  }

  renderDataCollector() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <DataCollector />
      </Col>
    );
  }

  renderGroupMgnt() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <GroupsDevices />
      </Col>
    );
  }

  renderOlsTerms() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <OlsTerms />
      </Col>
    );
  }

  renderNovncSettings() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <NovncSettings />
      </Col>
    );
  }

  renderTextTemplates() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <TextTemplateContainer />
      </Col>
    );
  }

  renderContent(component) {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        {component}
      </Col>
    );
  }

  renderDelayedJobs() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <DelayedJobs />
      </Col>
    );
  }

  renderTemplateManagement() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <TemplateManagement />
      </Col>
    );
  }

  render() {
    return (
      <div>
        <Grid fluid>
          <Row className="card-navigation">
            <AdminNavigation toggleTree={this.toggleTree} />
          </Row>
          <Row className="card-content container-fluid" >
            {this.tree()}
            {this.mainContent()}
          </Row>
          <Row>
            <Notifications />
          </Row>
        </Grid>
      </div>
    );
  }
}

export default AdminHome;
