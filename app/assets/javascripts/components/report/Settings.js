import React, {Component} from 'react'
import {Table} from 'react-bootstrap'

const Settings = ({settings, toggleCheckbox, toggleCheckAll, checkedAll}) => {
  let checkBoxs = settings.map( (setting, i) => {
    const {text, checked} = setting
    return(
        <CheckBox key={i}
                  text={text}
                  checked={checked}
                  toggleCheckbox={toggleCheckbox.bind(null, text, checked)} />
    )
  })

  return (
    <Table striped>
      <thead>
        <tr>
          <th>
            <input type="checkbox"
                   checked={checkedAll}
                   onChange={toggleCheckAll} />
            <span className="g-marginLeft--10"> Selected all </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {checkBoxs}
      </tbody>
    </Table>
  )
}

const CheckBox = ({text, checked, toggleCheckbox}) => {
  return (
    <tr >
      <td>
        <input type="checkbox"
               onChange={toggleCheckbox}
               checked={checked} />
        <span className="g-marginLeft--10"> {text} </span>
      </td>
    </tr>
  )
}

export default Settings
