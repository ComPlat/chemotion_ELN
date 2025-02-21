# frozen_string_literal: true

require 'rails_helper'

describe Entities::SampleEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        sample,
        detail_levels: detail_levels,
        displayed_in_list: displayed_in_list,
        policy: policy,
      )
    end

    let(:sample) { create(:sample, :with_residues) }
    let(:displayed_in_list) { false }
    let(:policy) { nil }
    let(:detail_levels) { { Sample => sample_detail_level } }

    context 'when detail level for Sample is 10' do
      let(:sample_detail_level) { 10 }

      it 'returns a sample with the following attributes' do
        expect(grape_entity_as_hash).to include(
          can_copy: false,
          can_publish: false,
          can_update: false,
          decoupled: false,
          external_label: sample.external_label,
          id: sample.id,
          is_restricted: false,
          molecular_mass: sample.molecular_mass,
          sum_formula: sample.sum_formula,
          type: 'sample',
          molfile: sample.molfile,
          _contains_residues: true,
          ancestor_ids: sample.ancestor_ids,
          boiling_point: sample.boiling_point,
          children_count: 0,
          density: sample.density,
          description: sample.description,
          imported_readout: sample.imported_readout,
          is_top_secret: sample.is_top_secret,
          location: sample.location,
          melting_point: sample.melting_point,
          metrics: sample.metrics,
          molarity_unit: sample.molarity_unit,
          molarity_value: sample.molarity_value,
          molecule_name_hash: sample.molecule_name_hash,
          name: sample.name,
          parent_id: sample.parent_id,
          pubchem_tag: sample.molecule.tag.taggable_data,
          purity: sample.purity,
          reaction_description: sample.reaction_description,
          real_amount_unit: sample.real_amount_unit,
          real_amount_value: sample.real_amount_value,
          sample_svg_file: sample.sample_svg_file,
          short_label: sample.short_label,
          showed_name: sample.showed_name,
          solvent: sample.solvent,
          stereo: sample.stereo,
          target_amount_unit: sample.target_amount_unit,
          target_amount_value: sample.target_amount_value,
          user_labels: sample.user_labels,
          xref: sample.xref,
          created_at: I18n.l(sample.created_at, format: :eln_timestamp),
          updated_at: I18n.l(sample.updated_at, format: :eln_timestamp),
        )
      end

      it 'returns a sample with a tag' do
        expect(grape_entity_as_hash[:tag]).not_to be_empty
      end

      it 'returns a sample with segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end

      it 'returns a sample with residues' do
        expect(grape_entity_as_hash[:residues]).not_to be_empty
      end

      it 'returns a sample with elemental_compositions' do
        expect(grape_entity_as_hash[:elemental_compositions]).not_to be_empty
      end

      it 'returns a sample with a container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a sample with a molecule' do
        expect(grape_entity_as_hash[:molecule]).not_to be_empty
      end

      it 'returns a sample with a code_log' do
        expect(grape_entity_as_hash[:code_log]).not_to be_empty
      end
    end

    context 'when detail level for Sample is 2' do
      let(:sample_detail_level) { 2 }

      it 'returns a sample with the following (anonymized) attributes' do
        expect(grape_entity_as_hash).to include(
          can_copy: false,
          can_publish: false,
          can_update: false,
          decoupled: false,
          external_label: sample.external_label,
          id: sample.id,
          is_restricted: true,
          molecular_mass: sample.molecular_mass,
          sum_formula: sample.sum_formula,
          type: 'sample',
          molfile: sample.molfile,
          _contains_residues: false,
          ancestor_ids: [],
          boiling_point: '***',
          children_count: '***',
          density: '***',
          description: '***',
          imported_readout: '***',
          is_top_secret: '***',
          location: '***',
          melting_point: '***',
          metrics: '***',
          molarity_unit: '***',
          molarity_value: '***',
          molecule_name_hash: {},
          name: '***',
          parent_id: '***',
          pubchem_tag: '***',
          purity: '***',
          reaction_description: '***',
          real_amount_unit: '***',
          real_amount_value: '***',
          sample_svg_file: '***',
          short_label: '***',
          showed_name: '***',
          solvent: [],
          stereo: '***',
          target_amount_unit: '***',
          target_amount_value: '***',
          # user_labels: '***',
          xref: '***',
          created_at: I18n.l(sample.created_at, format: :eln_timestamp),
          updated_at: I18n.l(sample.updated_at, format: :eln_timestamp),
        )
      end

      it 'returns a sample an anonymized tag' do
        expect(grape_entity_as_hash[:tag]).to eq(nil)
      end

      it 'returns a sample without segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).to be_empty
      end

      it 'returns a sample with anonymized residues' do
        expect(grape_entity_as_hash[:residues]).to be_empty
      end

      it 'returns a sample with anonymized elemental_compositions' do
        expect(grape_entity_as_hash[:elemental_compositions]).to be_empty
      end

      it 'returns a sample with a container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a sample with a molecule' do
        expect(grape_entity_as_hash[:molecule]).not_to be_empty
      end

      it 'returns a sample with a code_log' do
        expect(grape_entity_as_hash[:code_log]).not_to be_empty
      end
    end

    context 'when detail level for Sample is 1' do
      let(:sample_detail_level) { 1 }

      it 'returns a sample with an anonymized container' do
        expect(grape_entity_as_hash[:container]).to eq(nil)
      end
    end

    context 'when detail level for Sample is 0' do
      let(:sample_detail_level) { 0 }

      it 'returns a sample an anonymized molfile' do
        expect(grape_entity_as_hash).to include(
          molfile: '***',
        )
      end

      it 'returns a molecule only with molecular_weight and exact_molecular_weight' do
        expect(grape_entity_as_hash[:molecule]).to include(
          boiling_point: nil,
          cano_smiles: nil,
          cas: nil,
          density: nil,
          exact_molecular_weight: sample.molecule.exact_molecular_weight,
          id: nil,
          inchikey: nil,
          inchistring: nil,
          is_partial: nil,
          iupac_name: nil,
          melting_point: nil,
          molecular_weight: sample.molecule.molecular_weight,
          molecule_svg_file: nil,
          molfile: nil,
          molfile_version: nil,
          names: nil,
          sum_formular: nil,
          molecule_names: nil,
        )
      end
    end

    context 'when entity represented with a policy' do
      let(:sample_detail_level) { 10 }
      let(:policy) do
        Struct.new(:update?, :copy?, :destroy?).new(true, true, true)
      end

      it 'returns the policy releated attributes' do
        expect(grape_entity_as_hash).to include(
          can_copy: true,
          can_publish: true,
          can_update: true,
        )
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }
      let(:sample_detail_level) { 10 }

      it 'returns a sample without following attributes' do
        expect(grape_entity_as_hash).not_to include(
          :can_copy,
          :can_publish,
          :can_update,
          :code_log,
          :container,
          :_contains_residues,
          :boiling_point,
          :children_count,
          :description,
          :elemental_compositions,
          :imported_readout,
          :location,
          :melting_point,
          :molarity_unit,
          :molarity_value,
          :parent_id,
          :reaction_description,
          :real_amount_unit,
          :real_amount_value,
          :residues,
          :segments,
          :solvent,
          :target_amount_unit,
          :target_amount_value,
        )
      end
    end
  end
end
