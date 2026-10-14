# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::MediumEntity do
  subject(:represented_medium) { described_class.represent(medium).as_json }

  let(:medium) { create(:medium_sample, name: 'TheMedium') }

  it 'exposes medium name as label' do
    expect(represented_medium).to include(label: 'TheMedium')
  end
end
