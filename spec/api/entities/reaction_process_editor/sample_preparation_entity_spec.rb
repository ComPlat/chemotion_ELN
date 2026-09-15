# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SamplePreparationEntity do
  subject(:represented_preparation) { described_class.represent(sample_preparation).as_json }

  let(:sample_preparation) { create(:samples_preparation) }

  it 'exposes :sample_id' do
    expect(represented_preparation).to include(sample_id: sample_preparation.sample_id)
  end

  it 'exposes :preparations' do
    expect(represented_preparation).to include(preparations: %w[DEGASSED DRYING])
  end

  it 'exposes :equipment' do
    expect(represented_preparation).to include(equipment: %w[FUNNEL REACTOR])
  end

  it 'exposes :details' do
    expect(represented_preparation).to include(details: 'Sample Preparation Details')
  end

  context 'with nil preparations' do
    let(:sample_preparation) { create(:samples_preparation, preparations: nil) }

    it 'defaults preparations to an empty array' do
      expect(represented_preparation).to include(preparations: [])
    end
  end

  context 'with nil equipment' do
    let(:sample_preparation) { create(:samples_preparation, equipment: nil) }

    it 'defaults equipment to an empty array' do
      expect(represented_preparation).to include(equipment: [])
    end
  end
end
