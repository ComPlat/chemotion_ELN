# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Sample do
  describe 'save' do
    subject(:sample) { create(:sample) }

    it 'triggers UpdateIntermediateAmountsInWorkup' do
      allow(Usecases::ReactionProcessEditor::Samples::UpdateIntermediateAmountsInWorkup).to receive(:execute!)
      sample.save
      expect(Usecases::ReactionProcessEditor::Samples::UpdateIntermediateAmountsInWorkup).to have_received(:execute!)
        .with(sample: sample)
    end
  end
end
