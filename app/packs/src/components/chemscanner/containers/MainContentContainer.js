import React from 'react';
import { connect } from 'react-redux';

import MainContent from 'src/components/chemscanner/components/MainContent';

import { removeFile } from 'src/components/chemscanner/actions/fileActions';

const MainContentContainer = props => <MainContent {...props} />;

const mapStateToProps = state => ({
  files: state.get('files'),
});

const mapDispatchToProps = dispatch => ({
  removeFile: ({ fileUid }) => dispatch(removeFile(fileUid))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainContentContainer);
