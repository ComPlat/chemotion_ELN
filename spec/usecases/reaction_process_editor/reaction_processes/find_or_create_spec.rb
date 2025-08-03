# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcesses::FindOrCreate do
  subject(:usecase) { described_class.execute!(reaction: reaction) }

  let!(:reaction) { create_default(:valid_reaction) }

  context 'without ReactionProcess' do
    it 'creates ReactionProcess' do
      expect { usecase }.to change(reaction, :reaction_process).from(nil)
    end

    it 'creates Provenance' do
      expect { usecase }.to change { reaction.reaction_process&.provenance }.from(nil)
    end

    it 'sets automation_ordinal' do
      expect { usecase }.to change { reaction.reaction_process&.automation_ordinal }.to(0)
    end
  end

  context 'with ReactionProcess' do
    let!(:reaction_process) { create_default(:reaction_process, automation_ordinal: 5) }
    let!(:provenance) { create(:provenance) }

    it 'keeps ReactionProcess' do
      expect { usecase }.not_to change(reaction, :reaction_process).from(reaction_process)
    end

    it 'keeps Provenance' do
      expect { usecase }.not_to change(reaction_process, :provenance).from(provenance)
    end

    it 'retains automation_ordinal' do
      expect { usecase }.not_to(change { reaction.reaction_process&.automation_ordinal })
    end
  end
end
