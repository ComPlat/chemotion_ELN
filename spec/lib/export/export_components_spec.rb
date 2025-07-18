# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Export::ExportComponents do
  describe '.build_component_column_query' do
    let(:base_selection) { 'samples.*' }

    context 'with valid component fields' do
      let(:selected_components) { %w[name mass purity] }

      it 'returns an array with base selection and corresponding SQL fields' do
        result = described_class.build_component_column_query(base_selection, components: selected_components)

        expect(result).to be_an(Array)
        expect(result.first).to eq(base_selection)
        expect(result.last).to include('comp."name" as "name"')
        expect(result.last).to include('comp."component_properties"->>\'amount_g\' as "mass"')
        expect(result.last).to include('comp."component_properties"->>\'purity\' as "purity"')
      end
    end

    context 'with an empty component list' do
      let(:selected_components) { [] }

      it 'returns only the base selection and an empty component list' do
        result = described_class.build_component_column_query(base_selection, components: selected_components)

        expect(result).to eq([base_selection, []])
      end
    end

    context 'with an invalid component field' do
      let(:selected_components) { %w[name invalid_field mass] }

      it 'ignores the invalid field and includes only valid ones' do
        result = described_class.build_component_column_query(base_selection, components: selected_components)

        expect(result.first).to eq(base_selection)
        expect(result.last).to include('comp."name" as "name"')
        expect(result.last).to include('comp."component_properties"->>\'amount_g\' as "mass"')
        expect(result.last).not_to(be_any { |q| q.include?('invalid_field') })
      end
    end

    context 'with nil components' do
      it 'raises an error or returns only base selection' do
        expect do
          described_class.build_component_column_query(base_selection, components: nil)
        end.to raise_error(NoMethodError)
      end
    end
  end
end
