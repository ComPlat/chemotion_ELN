# frozen_string_literal: true

require 'rails_helper'

describe Entities::AttachmentEntity do
  describe '.represent' do
    subject(:entity) { described_class.represent(attachment) }

    context 'with an image' do
      let(:attachment) { create(:attachment, :with_png_image) }

      it 'is exposed as previewable' do
        expect(grape_entity_as_hash).to include(previewable: true)
      end
    end

    context 'with a non-image, non-PDF file' do
      let(:attachment) { create(:attachment) }

      it 'is exposed as not previewable' do
        expect(grape_entity_as_hash).to include(previewable: false)
      end
    end
  end
end
