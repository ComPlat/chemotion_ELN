import React from 'react';
import Select from 'react-select';

import ElementActions from '../actions/ElementActions';
import CollectionManagementModal from './CollectionManagementModal';

export default class RemoveModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <CollectionManagementModal 
        action={ElementActions.removeElementsCollection}
        modal_title={"Remove selected elements from this Collection?"}
        show_collections={false}
      />
    )
  }
}
