import React from 'react'
import expect from 'expect'
import { mount } from 'enzyme'
import {LiteratureContent} from '../../../app/assets/javascripts/components/report/ReportElements'

describe('LiteratureContent', () => {
  const literatures = [
    {id: 1, title: "title_1", url: "www.literature_1.com", type: "literature"},
    {id: 2, title: "title_2", url: "www.literature_2.com", type: "literature"}
  ]

  const wrapper = (show, literatures) => {
    return mount(<LiteratureContent show={show}
                                    literatures={literatures} />)
  }

  describe('hide', () => {
    it('should render null', () => {
      const expected = null
      const actual = wrapper(false, literatures).html()
      expect(actual).toEqual(expected)
    })
  })

  describe('show', () => {
    it('should render the header of Literatures ', () => {
      const expected = '<h4> Literatures </h4>'
      const actual = wrapper(true, literatures).html()
      expect(actual).toInclude(expected)
    })

    it('should render contents & urls of Literatures ', () => {
      const expectedContent = (index) => {
        const expectedTitle = literatures[index].title
        const expectedUrl = literatures[index].url
        const actual = wrapper(true, literatures).html()
        expect(actual).toInclude(expectedTitle).toInclude(expectedUrl)
      }
      for(let i in literatures) { expectedContent(parseInt(i)) }
    })
  })
})
