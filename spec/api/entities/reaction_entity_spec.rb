# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        reaction,
        detail_levels: detail_levels,
        displayed_in_list: displayed_in_list,
        policy: policy,
      )
    end

    let(:detail_levels) { { Reaction => detail_level } }
    let(:displayed_in_list) { false }
    let(:policy) { nil }
    let(:reaction) do
      create(
        :reaction,
        reactants: [create(:valid_sample)],
        products: [create(:valid_sample)],
        starting_materials: [create(:valid_sample)],
        solvents: [create(:valid_sample)],
        purification_solvents: [create(:valid_sample)],
        variations: [{ id: '3be513c1-9932-40b4-8d0e-f11f526634f7',
                       products: { '47': { aux: { yield: '0',
                                                  purity: 0.29,
                                                  loading: nil,
                                                  molarity: 0,
                                                  sumFormula: 'C21H18N2O2',
                                                  coefficient: 1,
                                                  isReference: false,
                                                  molecularWeight: 330.37982 },
                                           unit: 'g',
                                           value: nil },
                                   '48': { aux: { yield: '100',
                                                  purity: 0.12,
                                                  loading: nil,
                                                  molarity: 0,
                                                  sumFormula: 'C31H30O4',
                                                  coefficient: 1,
                                                  isReference: false,
                                                  molecularWeight: 466.56750000000005 },
                                           unit: 'g',
                                           value: '6' } },
                       reactants: { '45': { aux: { yield: nil,
                                                   purity: 0.78,
                                                   loading: nil,
                                                   molarity: 0,
                                                   sumFormula: 'C10H17NO2S',
                                                   coefficient: 1,
                                                   isReference: false,
                                                   molecularWeight: 215.31247999999997 },
                                            unit: 'g',
                                            value: nil },
                                    '46': { aux: { yield: nil,
                                                   purity: 0.84,
                                                   loading: nil,
                                                   molarity: 0,
                                                   sumFormula: 'C10H16O4S',
                                                   coefficient: 1,
                                                   isReference: false,
                                                   molecularWeight: 232.29664 },
                                            unit: 'g',
                                            value: nil } },
                       properties: { duration: { foo: {}, unit: 'Hour(s)', value: '19' },
                                     temperature: { unit: '<C2><B0>C', value: '1' } },
                       startingMaterials: { '43': { aux: { yield: nil,
                                                           purity: 0.25,
                                                           loading: nil,
                                                           molarity: 0,
                                                           sumFormula: 'C10H10BF4IN2',
                                                           coefficient: 1,
                                                           isReference: true,
                                                           molecularWeight: 371.9088828000001 },
                                                    unit: 'g',
                                                    value: 0.483 },
                                            '44': { aux: { yield: nil,
                                                           purity: 0.4,
                                                           loading: nil,
                                                           molarity: 0,
                                                           sumFormula: 'C32H72Cr2N2O7',
                                                           coefficient: 1,
                                                           isReference: false,
                                                           molecularWeight: 700.9154799999998 },
                                                    unit: 'g',
                                                    value: nil } } },
                     { id: 'd0a7087f-bf1b-479a-b684-783b004ff588',
                       products: { '47': { aux: { yield: '0',
                                                  purity: 0.29,
                                                  loading: nil,
                                                  molarity: 0,
                                                  sumFormula: 'C21H18N2O2',
                                                  coefficient: 1,
                                                  isReference: false,
                                                  molecularWeight: 330.37982 },
                                           unit: 'g',
                                           value: nil },
                                   '48': { aux: { yield: '2',
                                                  purity: 0.12,
                                                  loading: nil,
                                                  molarity: 0,
                                                  sumFormula: 'C31H30O4',
                                                  coefficient: 1,
                                                  isReference: false,
                                                  molecularWeight: 466.56750000000005 },
                                           unit: 'g',
                                           value: '0.03' } },
                       reactants: { '45': { aux: { yield: nil,
                                                   purity: 0.78,
                                                   loading: nil,
                                                   molarity: 0,
                                                   sumFormula: 'C10H17NO2S',
                                                   coefficient: 1,
                                                   isReference: false,
                                                   molecularWeight: 215.31247999999997 },
                                            unit: 'g',
                                            value: nil },
                                    '46': { aux: { yield: nil,
                                                   purity: 0.84,
                                                   loading: nil,
                                                   molarity: 0,
                                                   sumFormula: 'C10H16O4S',
                                                   coefficient: 1,
                                                   isReference: false,
                                                   molecularWeight: 232.29664 },
                                            unit: 'g',
                                            value: nil } },
                       properties: { duration: { unit: 'Hour(s)', value: '15' },
                                     temperature: { unit: '<C2><B0>C', value: '2' } },
                       startingMaterials: { '43': { aux: { yield: nil,
                                                           purity: 0.25,
                                                           loading: nil,
                                                           molarity: 0,
                                                           sumFormula: 'C10H10BF4IN2',
                                                           coefficient: 1,
                                                           isReference: true,
                                                           molecularWeight: 371.9088828000001 },
                                                    unit: 'g',
                                                    value: 0.483 },
                                            '44': { aux: { yield: nil,
                                                           purity: 0.4,
                                                           loading: nil,
                                                           molarity: 0,
                                                           sumFormula: 'C32H72Cr2N2O7',
                                                           coefficient: 1,
                                                           isReference: false,
                                                           molecularWeight: 700.9154799999998 },
                                                    unit: 'g',
                                                    value: nil } } }],
      )
    end

    context 'when detail level for Reaction is 10' do
      let(:detail_level) { 10 }

      it 'returns a reaction with following attributes' do
        expect(grape_entity_as_hash).to include(
          can_copy: false,
          can_update: false,
          description: reaction.description,
          id: reaction.id,
          is_restricted: false,
          observation: reaction.observation,
          role: reaction.role,
          type: 'reaction',
          conditions: reaction.conditions,
          dangerous_products: reaction.dangerous_products,
          duration: reaction.duration,
          name: reaction.name,
          origin: reaction.origin,
          purification: reaction.purification,
          reaction_svg_file: reaction.reaction_svg_file,
          rf_value: reaction.rf_value,
          rinchi_long_key: reaction.rinchi_long_key,
          rinchi_short_key: reaction.rinchi_short_key,
          rinchi_web_key: reaction.rinchi_web_key,
          rxno: reaction.rxno,
          short_label: reaction.short_label,
          solvent: reaction.solvent,
          status: reaction.status,
          temperature: reaction.temperature,
          timestamp_start: reaction.timestamp_start,
          timestamp_stop: reaction.timestamp_stop,
          tlc_description: reaction.tlc_description,
          tlc_solvents: reaction.tlc_solvents,
        )
      end

      it 'returns a reaction with filtered variations keys' do
        expect(grape_entity_as_hash[:variations][0][:properties][:duration]).not_to include(:foo)
      end

      it 'returns a reaction with variations' do
        reaction.variations[0]['properties']['duration'].delete('foo')
        expect(grape_entity_as_hash[:variations]).to match_array(reaction.variations.map(&:deep_symbolize_keys))
      end

      it 'returns a reaction with products' do
        expect(grape_entity_as_hash[:products]).not_to be_empty
      end

      it 'returns a reaction with purification_solvents' do
        expect(grape_entity_as_hash[:purification_solvents]).not_to be_empty
      end

      it 'returns a reaction with reactants' do
        expect(grape_entity_as_hash[:reactants]).not_to be_empty
      end

      it 'returns a reaction with solvents' do
        expect(grape_entity_as_hash[:solvents]).not_to be_empty
      end

      it 'returns a reaction with starting_materials' do
        expect(grape_entity_as_hash[:starting_materials]).not_to be_empty
      end

      it 'returns a reaction with code_log' do
        expect(grape_entity_as_hash[:code_log]).not_to be_empty
      end

      it 'returns a reaction with a container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a research_plan with segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end

      it 'returns a reaction with a tag' do
        expect(grape_entity_as_hash[:tag]).not_to be_empty
      end
    end

    context 'when detail level for Reaction is 0' do
      let(:detail_level) { 0 }

      it 'returns a reaction with following attributes' do
        expect(grape_entity_as_hash).to include(
          can_copy: false,
          can_update: false,
          description: reaction.description,
          id: reaction.id,
          is_restricted: true,
          observation: reaction.observation,
          role: reaction.role,
          type: 'reaction',
          conditions: '***',
          dangerous_products: [],
          duration: '***',
          name: '***',
          origin: '***',
          purification: [],
          reaction_svg_file: '***',
          rf_value: '***',
          rinchi_long_key: '***',
          rinchi_short_key: '***',
          rinchi_web_key: '***',
          rxno: '***',
          short_label: '***',
          solvent: '***',
          status: '***',
          temperature: '***',
          timestamp_start: '***',
          timestamp_stop: '***',
          tlc_description: '***',
          tlc_solvents: '***',
          variations: [],
        )
      end

      it 'returns a reaction with products' do
        expect(grape_entity_as_hash[:products]).not_to be_empty
      end

      it 'returns a reaction with purification_solvents' do
        expect(grape_entity_as_hash[:purification_solvents]).not_to be_empty
      end

      it 'returns a reaction with reactants' do
        expect(grape_entity_as_hash[:reactants]).not_to be_empty
      end

      it 'returns a reaction with solvents' do
        expect(grape_entity_as_hash[:solvents]).not_to be_empty
      end

      it 'returns a reaction with starting_materials' do
        expect(grape_entity_as_hash[:starting_materials]).not_to be_empty
      end

      it 'returns a reaction without code_log' do
        expect(grape_entity_as_hash[:code_log]).to eq(nil)
      end

      it 'returns a reaction without a container' do
        expect(grape_entity_as_hash[:container]).to eq(nil)
      end

      it 'returns a research_plan without segments' do
        expect(grape_entity_as_hash[:segments]).to be_empty
      end

      it 'returns a reaction without a tag' do
        expect(grape_entity_as_hash[:tag]).to eq(nil)
      end
    end

    context 'when entity represented with a policy' do
      let(:detail_level) { 10 }
      let(:policy) do
        Struct.new(:update?, :copy?).new(true, true)
      end

      it 'returns the policy releated attributes' do
        expect(grape_entity_as_hash).to include(
          can_copy: true,
          can_update: true,
        )
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }
      let(:detail_level) { 10 }

      it 'returns a sample without following attributes' do
        expect(grape_entity_as_hash).not_to include(
          :can_copy,
          :can_update,
          :description,
          :observation,
          :conditions,
          :dangerous_products,
          :duration,
          :purification,
          :rf_value,
          :solvent,
          :temperature,
          :timestamp_start,
          :timestamp_stop,
          :tlc_description,
          :tlc_solvents,
        )
      end

      it 'returns a reaction without code_log' do
        expect(grape_entity_as_hash[:code_log]).to eq(nil)
      end

      it 'returns a reaction without container' do
        expect(grape_entity_as_hash[:container]).to eq(nil)
      end

      it 'returns a reaction without products' do
        expect(grape_entity_as_hash[:products]).to be_empty
      end

      it 'returns a reaction without purification_solvents' do
        expect(grape_entity_as_hash[:purification_solvents]).to be_empty
      end

      it 'returns a reaction without reactants' do
        expect(grape_entity_as_hash[:reactants]).to be_empty
      end

      it 'returns a reaction without segments' do
        expect(grape_entity_as_hash[:segments]).to be_empty
      end

      it 'returns a reaction without solvents' do
        expect(grape_entity_as_hash[:solvents]).to be_empty
      end

      it 'returns a reaction without starting_materials' do
        expect(grape_entity_as_hash[:starting_materials]).to be_empty
      end
    end
  end
end
