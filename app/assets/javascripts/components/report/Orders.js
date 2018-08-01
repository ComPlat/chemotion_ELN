import React from 'react';
import ObjRow from './OrdersDnD';

const allContent = ({ selectedObjs, template }) => (
  selectedObjs.map(obj => (
    <ObjRow
      id={obj.id}
      key={obj.id}
      element={obj}
      template={template}
    />
  ))
);

const suiContent = ({ selectedObjs, template }) => (
  selectedObjs.map((obj) => {
    if (obj.type === 'reaction') {
      return (
        <ObjRow
          id={obj.id}
          key={obj.id}
          element={obj}
          template={template}
        />
      );
    }
    return null;
  }).filter(r => r != null)
);

const spcContent = props => suiContent(props);

const rxlContent = props => suiContent(props);

const ordersContent = (props) => {
  switch (props.template) {
    case 'standard':
      return allContent(props);
    case 'spectrum':
      return spcContent(props);
    case 'supporting_information':
      return suiContent(props);
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return rxlContent(props);
    default:
      return null;
  }
};

const Orders = props => (
  <div className="report-orders">
    { ordersContent(props) }
  </div>
);

export default Orders;
