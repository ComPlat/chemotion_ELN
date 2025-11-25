# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::Samples::UpdateIntermediateType do
  subject(:usecase) do
    described_class.execute!(sample: sample, intermediate_type: new_intermediate_type)
  end

  let!(:sample) { create(:valid_sample) }
  let!(:reaction_intermediate_sample) do
    create :reactions_intermediate_sample, sample: sample, intermediate_type: 'OLD'
  end
  let!(:new_intermediate_type) { 'New Intermediate Type' }

  it 'sets intermediate_type' do
    expect { usecase }.to change {
      reaction_intermediate_sample.reload.intermediate_type
    }.from('OLD').to(new_intermediate_type)
  end
end
