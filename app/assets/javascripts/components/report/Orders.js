import React, {Component} from 'react'
import { Table } from 'react-bootstrap';
import ObjRow from './OrdersDnD';

const Orders = ({selectedObjs}) => {
  const content = selectedObjs.map( obj => {
    return <ObjRow id={obj.id} key={obj.id} element={obj} />
  })

  return (
    <Table className="elements" bordered hover>
      <tbody>
        {content}
      </tbody>
    </Table>
  )
}

export default Orders;
