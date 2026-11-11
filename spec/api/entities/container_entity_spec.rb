# frozen_string_literal: true

require 'rails_helper'

describe Entities::ContainerEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(container)
    end

    let(:container) { create(:analysis_container) }

    context 'with an analysis container entry' do
      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :id,
          :name,
          :description,
          :extended_metadata,
          code_log: satisfy do |code_log|
                      code_log.fetch(:id, '').match(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/)
                    end,
          children: satisfy { |children| children.is_a?(Array) },
          container_type: 'analysis',
          # dataset: '?', # TODO Labimotion::DatasetEntity
        )
      end
    end

    context 'with a dataset container entry' do
      let(:container) { create(:analysis_container, container_type: 'dataset') }

      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          container_type: 'dataset',
          attachments: satisfy { |attachments| attachments.is_a?(Array) },
        )
      end
    end

    context 'when extended metadata attributes are input' do
      it 'returns the extended_metadata related attributes' do
        expect(grape_entity_as_hash[:extended_metadata]).to include(
          report: false,
          status: 'Confirmed',
          kind: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)',
          instrument: 'analysis instrument',
          index: '0',
          content: JSON.parse('{"ops": [{"insert": "analysis contents"}]}'),
        )
      end

      it 'omits the MOF CIF marker on ordinary analyses' do
        expect(grape_entity_as_hash[:extended_metadata]).not_to have_key(:mof_cif)
      end
    end

    context 'with the analysis holding a MOF sample CIF' do
      let(:container) do
        create(:analysis_container).tap do |analysis|
          analysis.update!(extended_metadata: analysis.extended_metadata.merge('mof_cif' => 'true'))
        end
      end

      it 'returns the MOF CIF marker so it survives save and reload' do
        expect(grape_entity_as_hash[:extended_metadata]).to include(mof_cif: 'true')
      end
    end
  end
end
