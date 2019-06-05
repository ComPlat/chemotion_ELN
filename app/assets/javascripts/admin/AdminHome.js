import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col, Nav, NavItem } from 'react-bootstrap';
import AdminNavigation from './AdminNavigation';

import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import MessagePublish from './MessagePublish';
import DataCollector from './DataCollector';
import OlsTerms from './OlsTerms';

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
      return this.renderOlsTerms();
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
            <NavItem eventKey={0}>
              Dashboard
            </NavItem>
            <NavItem eventKey={1}>
              User Management
            </NavItem>
            <NavItem eventKey={2}>
              Message Publish
            </NavItem>
            <NavItem eventKey={3}>
              Data Collector
            </NavItem>
            <NavItem eventKey={4}>
              Load OLS Terms
            </NavItem>
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
  renderOlsTerms() {
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        <OlsTerms />
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
        </Grid>
      </div>
    );
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('AdminHome');
  if (domElement) { ReactDOM.render(<AdminHome />, domElement); }
});
