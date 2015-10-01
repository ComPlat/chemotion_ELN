import React from 'react';
import Select from 'react-select';

import CollectionActions from '../actions/CollectionActions';
import CollectionManagementModal from './CollectionManagementModal';

export default class RemoveModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <CollectionManagementModal 
        action={CollectionActions.removeElementsCollection}
        modal_title={"Remove selected elements from this Collection?"}
        show_collections={false}
      />
    )
  }
}
