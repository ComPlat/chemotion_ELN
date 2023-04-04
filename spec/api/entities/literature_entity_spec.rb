# frozen_string_literal: true

require 'rails_helper'

describe Entities::LiteratureEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        literature,
        with_element_count: with_element_count,
        with_user_info: with_user_info,
        with_element_and_user_info: with_element_and_user_info,
      )
    end

    let(:with_element_count) { false }
    let(:with_user_info) { false }
    let(:with_element_and_user_info) { false }
    let(:literature) { create(:literature) }

    context 'with any literature entry' do
      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :id,
          :title,
          :type,
          :url,
          :refs,
          :doi,
          :isbn,
          :created_at,
          :updated_at,
        )
      end
    end
  end
end
