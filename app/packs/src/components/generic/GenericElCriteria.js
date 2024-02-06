/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col } from 'react-bootstrap';
import { findIndex } from 'lodash';
import { GenInterface, SegmentCriteria } from 'chem-generic-ui';
import GenericEl from 'src/models/GenericEl';
import { segmentsByKlass } from 'src/apps/generic/Utils';

const buildCriteria = props => {
  const { genericEl } = props;
  if (!genericEl) return <span />;
  const options = [];
  options.push(
    {
      generic: genericEl,
      type: 'text',
      isEditable: true,
      isRequire: false,
      field: 'search_name',
      label: 'name',
    },
    {
      generic: genericEl,
      type: 'text',
      isEditable: true,
      isRequire: false,
      field: 'search_short_label',
      label: 'Short Label',
    }
  );
  genericEl.properties = genericEl.properties_release;
  const layersLayout = (
    <GenInterface
      generic={genericEl}
      fnChange={props.onChange}
      extLayers={options}
      genId={genericEl.id || 0}
      isPreview={false}
      isActiveWF
      isSearch
      fnNavi={() => {}}
    />
  );
  return <div style={{ margin: '15px' }}>{layersLayout}</div>;
};

buildCriteria.propTypes = {
  genericEl: PropTypes.instanceOf(GenericEl),
  onChange: PropTypes.func,
  onSubChange: PropTypes.func,
};

buildCriteria.defaultProps = {
  genericEl: null,
  onChange: () => {},
  onSubChange: () => {},
};

export default class GenericElCriteria extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
      segments: segmentsByKlass(props.genericEl.name),
    };
    this.onChange = this.onChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onSegmentChange = this.onSegmentChange.bind(this);
  }

  onChange(el) {
    const genericEl = el;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  onSegmentChange(sg) {
    const { segments } = this.state;
    const idx = findIndex(segments, o => o.id === sg.id);
    segments.splice(idx, 1, sg);
    this.setState({ segments });
  }

  onSearch() {
    const { genericEl, segments } = this.state;
    genericEl.segments = segments;
    this.props.onSearch(genericEl);
  }

  render() {
    const { genericEl, segments } = this.state;
    const title = (
      <Row key="criteria_init">
        <Col
          md={12}
          style={{
            fontWeight: 'bold',
            fontStyle: 'italic',
            fontSize: 'x-large',
          }}
        >
          Segments
        </Col>
      </Row>
    );

    const layout = [];
    (segments || []).forEach(seg => {
      const igs = (
        <SegmentCriteria segment={seg} onChange={this.onSegmentChange} />
      );
      layout.push(igs);
    });

    return (
      <div className="search_criteria_mof">
        <div className="modal_body">
          {buildCriteria({
            genericEl,
            onChange: this.onChange,
            onSubChange: this.onSubChange,
          })}
          {segments && segments.length > 0 ? title : null}
          {layout}
        </div>
        <div className="btn_footer">
          <Button bsStyle="warning" onClick={this.props.onHide}>
            Close
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={this.onSearch}>
            Search
          </Button>
          &nbsp;
        </div>
      </div>
    );
  }
}

GenericElCriteria.propTypes = {
  genericEl: PropTypes.object,
  onHide: PropTypes.func,
  onSearch: PropTypes.func,
};

GenericElCriteria.defaultProps = {
  genericEl: null,
  onHide: () => {},
  onSearch: () => {},
};
