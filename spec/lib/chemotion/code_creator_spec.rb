# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CodeCreator' do
  subject { Chemotion::CodeCreator }

  describe 'code creation' do
    it 'create functions return a string' do
      expect(subject.uuid_to_digit).to match(/\d{40}/)
    end
  end
end
