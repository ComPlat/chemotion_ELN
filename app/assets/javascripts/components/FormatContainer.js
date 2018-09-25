/* eslint-disable no-param-reassign */

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import FormatComponent from './FormatComponent';
import ReportActions from './actions/ReportActions';
import DetailActions from './actions/DetailActions';
import ElementActions from './actions/ElementActions';
import UIStore from './stores/UIStore';
import ReportStore from './stores/ReportStore';
import { formatAnalysisContent } from './utils/ElementUtils';

function extractAnalyses(listEls) {
  const listObjs = [];
  listEls.forEach((el) => {
    let obj = {};
    if (el.type === 'sample') {
      obj = {
        type: 'Sample',
        id: el.id,
        short_label: el.short_label,
        analyses: _.cloneDeep(el.analyses),
        children: []
      };
      listObjs.push(obj);
    } else if (el.type === 'reaction') {
      let rAna = [];
      const ana = el.container.children
        .filter(x => x.container_type === 'analyses')[0];
      if (ana) {
        rAna = ana.children.filter(x => x.container_type === 'analysis');
      }

      let samplesAna = [];
      samplesAna = samplesAna.concat(extractAnalyses(el.starting_materials));
      samplesAna = samplesAna.concat(extractAnalyses(el.products));

      obj = {
        type: 'Reaction',
        id: el.id,
        short_label: el.short_label,
        analyses: _.cloneDeep(rAna),
        children: samplesAna
      };

      listObjs.push(obj);
    }
  });

  return listObjs;
}

export default class FormatContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedObjTags: { sampleIds: [], reactionIds: [] },
      defaultObjTags: { sampleIds: [], reactionIds: [] },
      selectedObjs: [],
      isSaved: true
    };

    this.onChangeUI = this.onChangeUI.bind(this);
    this.onChangeRp = this.onChangeRp.bind(this);
    this.onFormat = this.onFormat.bind(this);
    this.onSave = this.onSave.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  componentDidMount() {
    ReportStore.listen(this.onChangeRp);
    UIStore.listen(this.onChangeUI);
    this.onChangeUI(UIStore.getState());
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    ReportStore.unlisten(this.onChangeRp);
  }

  onChangeUI(state) {
    ReportActions.updateCheckedTags.defer(state);
  }

  onChangeRp(state) {
    const selectedObjs = extractAnalyses(state.selectedObjs);

    this.setState({
      selectedObjs,
      selectedObjTags: state.selectedObjTags,
      defaultObjTags: state.defaultObjTags
    });
  }

  onFormat() {
    let selectedObjs = _.cloneDeep(this.state.selectedObjs);

    const formatAnalyses = (el) => {
      (el.analyses || []).forEach((ana) => {
        const { content } = ana.extended_metadata;
        if (typeof content === 'string') {
          ana.extended_metadata.content = JSON.parse(content);
        }

        ana.extended_metadata.content = formatAnalysisContent(ana);
      });
    };

    selectedObjs = selectedObjs.map((obj) => {
      formatAnalyses(obj);
      if (obj.type === 'Reaction') formatAnalyses(obj.children);

      return obj;
    });

    const isSaved = _.isEqual(selectedObjs, this.state.selectedObjs);

    this.setState({ selectedObjs, isSaved });
  }

  onSave() {
    const { selectedObjs } = this.state;
    const flattenObjs = (objs) => {
      const flattenedObjs = objs.reduce((acc, cur) => {
        if (cur.children && cur.children.length > 0) {
          acc = acc.concat(cur.analyses);
          return acc.concat(flattenObjs(cur.children));
        }

        return acc.concat(cur.analyses);
      }, []);

      return flattenedObjs;
    };

    const objs = flattenObjs(selectedObjs);

    objs.forEach(obj => ElementActions.updateContainerContent(obj));

    this.setState({ selectedObjs, isSaved: true });
  }

  onClose() {
    DetailActions.close(this.props.format, this.state.isSaved);
  }

  render() {
    const { selectedObjs, isSaved } = this.state;

    return (
      <FormatComponent
        list={selectedObjs}
        onFormat={this.onFormat}
        bsStyle={isSaved ? 'primary' : 'info'}
        onSave={this.onSave}
        onClose={this.onClose}
      />
    );
  }
}

FormatContainer.propTypes = {
  format: PropTypes.shape.isRequired
};

/* eslint-enable no-param-reassign */
