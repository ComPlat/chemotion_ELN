# frozen_string_literal: true

require 'rails_helper'

describe Entities::ContainerEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(container)
    end

    let(:container) { create(:analysis_container) }

    context 'with any container entry' do
      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :id,
          :name,
          :container_type,
          :description,
          :extended_metadata,
          :preview_img,
          :attachments,
          :code_log,
          :children,
          :dataset,
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
          content: JSON.parse('{"ops": [{"insert": "analysis contents"}]}'),
        )
      end
    end
  end
end
