# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AttachmentPolicy do
  describe '.can_delete?' do
    let(:user) { create(:person) }
    let(:record) { nil }

    subject { described_class.can_delete?(user, record) }

    context 'when attachment not exists' do
      it 'returns with false' do
        expect(subject).to eq(false)
      end
    end

    context 'when attachment is unrelated to current user' do
      let(:record) { create(:attachment) }

      it 'returns with false' do
        expect(subject).to eq(false)
      end
    end

    context 'when attachment is not attached to a container and created for current user' do
      let(:record) { create(:attachment, created_for: user.id, attachable: nil) }

      it 'returns with true' do
        expect(subject).to eq(true)
      end
    end

    context 'when attachment is attached to a container owned by current user' do
      let(:container) { create(:container, containable: user) }
      let(:record) { create(:attachment, attachable: container) }

      it 'returns with true' do
        expect(subject).to eq(true)
      end
    end

    context 'when attachment is attached to a container and current user has update rights' do
      let(:other_user) { create(:person) }
      let(:container) { create(:container, containable: other_user) }
      let(:record) { create(:attachment, attachable: container) }

      it 'returns with true' do
        allow(ElementPolicy).to receive(:update?).and_return(true)
        expect(subject).to eq(true)
      end
    end
  end

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
