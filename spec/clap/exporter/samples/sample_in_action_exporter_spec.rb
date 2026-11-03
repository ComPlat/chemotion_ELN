# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Samples::SampleInActionExporter do
  subject(:sample_export) { described_class.new(action).to_clap }

  context 'with a medium action' do
    let(:action) { create(:reaction_process_activity_add_medium, workup: { acts_as: 'MEDIUM' }) }

    it 'exports medium actions' do
      expect(sample_export.to_h).to include(
        reaction_role: :MEDIUM,
        label: action.medium.label,
        name: action.medium.name,
      )
    end
  end

  context 'with an ontology action' do
    let(:ontology) do
      ReactionProcessEditor::Ontology.create!(
        ontology_id: 'ONT:sample',
        label: 'Ontology Label',
        name: 'Ontology Name',
      )
    end
    let(:action) do
      create(
        :reaction_process_activity,
        activity_name: 'ADD',
        workup: { acts_as: 'SAMPLE', sample_id: ontology.ontology_id }.deep_stringify_keys,
      )
    end

    it 'exports ontology actions' do
      expect(sample_export.to_h).to include(
        label: 'Ontology Label',
        name: 'Ontology Name',
        ontology: { id: 'ONT:sample', label: 'Ontology Label', name: 'Ontology Name' },
      )
    end
  end

  context 'with an unknown reaction role' do
    let(:action) { create(:reaction_process_activity_add_sample, workup: { acts_as: 'bad' }) }

    it 'falls back for unknown reaction roles' do
      expect(sample_export.reaction_role).to eq(:UNSPECIFIED)
    end
  end

  context 'with an action sample' do
    let(:action) do
      create(
        :reaction_process_activity_add_sample,
        workup: {
          acts_as: 'SAMPLE',
          target_amount: { value: '12', unit: 'mg', percentage: 50 },
          is_waterfree_solvent: true,
        },
      )
    end

    before do
      create(
        :samples_preparation,
        reaction_process: action.reaction_process,
        sample: action.sample,
        preparations: ['DRIED'],
      )
    end

    it 'exports the action sample' do
      expect(sample_export.to_h).to include(
        reaction_role: :SAMPLE,
        label: action.sample.preferred_label,
        amount: { mass: { value: 12.0, unit: :MILLIGRAM } },
        percentage: { value: 50.0 },
        purity: { value: 100.0 },
        is_waterfree_solvent: true,
      )
    end
  end
end
