import React from 'react'
import {Table} from 'react-bootstrap'
import PropTypes from 'prop-types'

const CheckBoxs = ({items, toggleCheckbox, toggleCheckAll, checkedAll, customClass = 'check-box-list' , customStyle = {}}) => {
  let checkBoxs = items.map( (setting, i) => {
    const {text, checked} = setting
    return(
        <CheckBox key={i}
                  text={text}
                  checked={checked}
                  toggleCheckbox={toggleCheckbox.bind(null, text, checked)} />
    )
  })
  const lgth = items && items.length
  if (customClass == 'check-box-list') {
    customClass =  lgth && lgth < 4 ? `check-box-list-${lgth}` : 'check-box-list'
  }
  return (
    <Table striped>
      <thead>
        <tr>
          <th>
            <input type="checkbox"
                   checked={checkedAll}
                   onChange={toggleCheckAll}
                   className="common-checkbox" />
            <span className="g-marginLeft--10">
              {checkedAll ? "Deselect all" : "Select all"}
            </span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr >
          <td>
            <ul className={customClass} style={customStyle}>
              {checkBoxs}
            </ul>
          </td>
        </tr>
      </tbody>
    </Table>
  )
}
CheckBoxs.propTypes = {
  items: PropTypes.array,
  checkedAll: PropTypes.bool,
  toggleCheckAll: PropTypes.func,
  toggleCheckbox: PropTypes.func,
  customClass: PropTypes.string,
  customStyle: PropTypes.object,
}

const CheckBox = ({text, checked, toggleCheckbox}) => {
  return (
    <li>
      <input type="checkbox"
               onChange={toggleCheckbox}
               checked={checked}
               className="common-checkbox" />
      <span className="g-marginLeft--10"> {text} </span>
    </li>

  )
}

CheckBox.propTypes = {
  text: PropTypes.string,
  checked: PropTypes.bool,
  toggleCheckbox: PropTypes.func,
}

export default CheckBoxs
