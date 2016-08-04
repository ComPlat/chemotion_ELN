import React from 'react'
import expect from 'expect'
import { mount } from 'enzyme'
import sinon from 'sinon'
import CheckBoxs from '../../../app/assets/javascripts/components/report/CheckBoxs'

describe('CheckBoxs', () => {
  const items = [ {text: "formula", checked: true},
                  {text: "material", checked: true},
                  {text: "description", checked: true} ]
  const toggleCheckbox = () => {}
  const toggleCheckAll = () => {}
  const checkedAll = true
  const wrapper = (items, toggleCheckbox, toggleCheckAll, checkedAll) => {
    return mount(<CheckBoxs  items={items}
                             toggleCheckbox={toggleCheckbox}
                             toggleCheckAll={toggleCheckAll}
                             checkedAll={checkedAll} />)
  }

  it('should match text & checked', () => {
    const expectedText = items.reduce((p, c) => { return p + "  " + c.text }, "")
    const expectedLength = items.length + 1
    const actual = wrapper(items, toggleCheckbox, toggleCheckAll, checkedAll)
    expect(actual.text()).toInclude(expectedText)
    expect(actual.find('input').length).toEqual(expectedLength)

    const expectedCheckedness = (index) => {
      const expectedChecked = items[index].checked
      const checkedness = actual.find('input').at(index+1).props().checked
      expect(checkedness).toEqual(expectedChecked)
    }
    for(let i in items) { expectedCheckedness(parseInt(i)) }
  })

  it('should do toggleCheckbox', () => {
    const spy = sinon.spy()
    const actual = wrapper(items, spy, toggleCheckAll, checkedAll)
    const target = actual.find('input').last()
    target.simulate('change', {target: { checked: false }})
    expect(spy.callCount).toEqual(1)
  })

  it('should do toggleCheckAll', () => {
    const spy = sinon.spy()
    const actual = wrapper(items, toggleCheckbox, spy, checkedAll)
    const target = actual.find('input').first()
    target.simulate('change', {target: { checked: true }})
    expect(spy.callCount).toEqual(1)
  })
})
