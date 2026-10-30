# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcesses::FindOrCreateBySample do
  subject(:usecase) { described_class.execute!(sample: sample, current_user: user) }

  let!(:sample) { create_default(:sample, creator: user) }
  let(:user) { create :user }

  context 'without ReactionProcess' do
    it 'creates ReactionProcess' do
      expect { usecase }.to change(sample, :reaction_process).from(nil)
    end

    it 'creates Provenance' do
      expect { usecase }.to change { sample.reaction_process&.provenance }.from(nil)
    end

    it 'sets automation_ordinal' do
      expect { usecase }.to change { sample.reaction_process&.automation_ordinal }.to(0)
    end
  end

  context 'with ReactionProcess' do
    let!(:sample_process) { create_default(:sample_process, automation_ordinal: 5) }
    let!(:provenance) { create(:provenance, reaction_process: sample_process) }

    it 'keeps ReactionProcess' do
      expect { usecase }.not_to change(sample, :reaction_process).from(sample_process)
    end

    it 'keeps Provenance' do
      expect { usecase }.not_to change(sample_process, :provenance).from(provenance)
    end

    it 'retains automation_ordinal' do
      expect { usecase }.not_to(change { sample_process&.automation_ordinal })
    end
  end
end
