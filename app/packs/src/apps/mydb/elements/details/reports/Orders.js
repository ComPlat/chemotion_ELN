import React from 'react';
import ObjRow from 'src/apps/mydb/elements/details/reports/OrdersDnD';

const allContent = ({ selectedObjs, template }) => (
  selectedObjs.map((obj) => (
    <ObjRow
      id={obj.id}
      key={`${obj.type}${obj.id}`}
      element={obj}
      template={template}
    />
  ))
);

const reactionContent = ({ selectedObjs, template }) => (
  selectedObjs
    .filter((obj) => obj.type === 'reaction')
    .map((obj) => (
      <ObjRow
        id={obj.id}
        key={`${obj.type}${obj.id}`}
        element={obj}
        template={template}
      />
    ))
);

const ordersContent = (props) => {
  switch (props.template.value) {
    case 'standard':
      return allContent(props);
    case 'spectrum':
    case 'supporting_information':
    case 'supporting_information_std_rxn':
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return reactionContent(props);
    default:
      return allContent(props);
  }
};

const Orders = (props) => (
  <div className="report-orders d-flex flex-column gap-3">
    {ordersContent(props)}
  </div>
);

export default Orders;
