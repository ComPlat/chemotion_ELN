# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AttachmentPolicy do
  describe '.can_upload_chunk?' do
    let(:uuid) { 'invalid' }

    subject { described_class.can_upload_chunk?(uuid) }

    context 'when uuid is invalid' do
      it 'returns false' do
        expect(subject).to eq(false)
      end
    end

    context 'when uuid is valid' do
      let(:uuid) { 'dcd363a3-d3f9-4ae2-8dea-d32567082d78' }

      it 'returns true' do
        expect(subject).to eq(true)
      end
    end
  end
end
