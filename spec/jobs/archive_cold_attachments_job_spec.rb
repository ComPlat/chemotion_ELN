# frozen_string_literal: true

require 'rails_helper'
require 'tmpdir'

# rubocop:disable Rails/SkipsModelValidations
RSpec.describe ArchiveColdAttachmentsJob do
  describe 'when no cold tier is configured' do
    before { create(:admin) }

    it 'emails the admin instead of crashing on a nil storage' do
      allow(Attachment).to receive(:cold_storage_keys).and_return([])

      expect { described_class.perform_now }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end
  end

  describe 'choosing what to archive' do
    let(:sample) { create(:sample) }
    let(:attachment) { create(:attachment, attachable: sample) }

    around do |example|
      Dir.mktmpdir do |dir|
        Shrine.storages[:cold] = Shrine::Storage::FileSystem.new(dir)
        example.run
      ensure
        Shrine.storages.delete(:cold)
      end
    end

    # The job used to pre-filter on the attachment's own updated_at and miss these.
    it 'archives a file whose own updated_at is recent but whose root element is old' do
      attachment.update_column(:last_accessed_at, 13.months.ago)
      sample.update_column(:updated_at, 13.months.ago)
      expect(attachment.updated_at).to be > 12.months.ago # own date is fresh

      described_class.perform_now

      expect(attachment.reload.attachment_data['storage']).to eq 'cold'
    end

    it 'leaves a file alone while its root element is recent' do
      attachment.update_column(:last_accessed_at, 13.months.ago)
      sample.update_column(:updated_at, 1.day.ago)

      described_class.perform_now

      expect(attachment.reload.attachment_data['storage']).to eq 'store'
    end

    it 'leaves a recently read file alone even when its root element is old' do
      attachment.update_column(:last_accessed_at, 1.day.ago)
      sample.update_column(:updated_at, 13.months.ago)

      described_class.perform_now

      expect(attachment.reload.attachment_data['storage']).to eq 'store'
    end
  end
end
# rubocop:enable Rails/SkipsModelValidations
