import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import scriptLoader from 'react-async-script-loader';
import { Grid, Row, Col } from 'react-bootstrap';

import AbbreviationContainer from '../containers/AbbreviationContainer';
import HeaderMenuContainer from '../containers/HeaderMenuContainer';
import MainContentContainer from '../containers/MainContentContainer';
import LoadingModalContainer from '../containers/LoadingModalContainer';

class Root extends Component {
  componentDidMount() {
    const { isScriptLoaded, isScriptLoadSucceed, attachEditor } = this.props;
    const check = isScriptLoaded && isScriptLoadSucceed;

    if (!check) return;

    attachEditor('chemscanner-cdjs-container');
  }

  componentWillReceiveProps({
    isScriptLoaded,
    isScriptLoadSucceed,
    attachEditor
  }) {
    const check = (
      isScriptLoaded && isScriptLoadSucceed && !this.props.isScriptLoaded
    );
    if (!check) return;

    attachEditor('chemscanner-cdjs-container');
  }

  render() {
    const { modal, ui } = this.props;
    const abbView = ui.get('abbView') || false;

    return (
      <Grid fluid className="chemscanner-grid">
        <div id="chemscanner-cdjs-container" />
        <Row style={{ position: 'relative', zIndex: '9' }}>
          <Col xs={18} md={12}>
            <HeaderMenuContainer />
          </Col>
        </Row>
        <Row>
          <Col xs={18} md={12} className="chemscanner-files-contents">
            { abbView ?
              <AbbreviationContainer /> :
              <MainContentContainer modal={modal} />
            }
          </Col>
        </Row>
        <Row>
          <LoadingModalContainer />
        </Row>
      </Grid>
    );
  }
}

Root.propTypes = {
  ui: PropTypes.instanceOf(Immutable.Map).isRequired,
  isScriptLoaded: PropTypes.bool.isRequired,
  isScriptLoadSucceed: PropTypes.bool.isRequired,
  attachEditor: PropTypes.func.isRequired,
  modal: PropTypes.string
};

Root.defaultProps = {
  modal: ''
};

// const scriptUrl = '/cdjs/chemdrawweb/chemdrawweb.js';
const scriptUrl = 'https://chemdrawdirect.perkinelmer.cloud/js/chemdrawweb/chemdrawweb.js';
export default scriptLoader(scriptUrl)(Root);
