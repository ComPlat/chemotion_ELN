import React from 'react'
import {Table} from 'react-bootstrap'

const CheckBoxs = ({items, toggleCheckbox, toggleCheckAll, checkedAll}) => {
  let checkBoxs = items.map( (setting, i) => {
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
            <span className="g-marginLeft--10">
              {checkedAll ? "Deselect all" : "Select all"}
            </span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr >
          <td>
            <ul id="export-import">
              {checkBoxs}
            </ul>
          </td>
        </tr>
      </tbody>
    </Table>
  )
}
CheckBoxs.propTypes = {
  items: React.PropTypes.array,
  checkedAll: React.PropTypes.bool,
  toggleCheckAll: React.PropTypes.func,
  toggleCheckbox: React.PropTypes.func,

}

const CheckBox = ({text, checked, toggleCheckbox}) => {
  return (
    <li>
      <input type="checkbox"
               onChange={toggleCheckbox}
               checked={checked} />
      <span className="g-marginLeft--10"> {text} </span>
    </li>

  )
}
CheckBox.propTypes = {
  text: React.PropTypes.string,
  checked: React.PropTypes.bool,
  toggleCheckbox: React.PropTypes.func,
}

export default CheckBoxs
