import React, {Component} from 'react'
import { Table } from 'react-bootstrap';
import ObjRow from './OrdersDnD';

const Orders = ({selectedObjs, template}) => {
  const allContent = selectedObjs.map( obj => {
    return <ObjRow id={obj.id} key={obj.id} element={obj} template={template} />
  })

  const siContent = selectedObjs.map( obj => {
    if(obj.type === 'reaction') {
      return <ObjRow id={obj.id} key={obj.id} element={obj} template={template} />
    }
  })

  return (
    <div className="report-orders">
      {template === 'supporting_information' ? siContent : allContent}
    </div>
  )
}

export default Orders;
