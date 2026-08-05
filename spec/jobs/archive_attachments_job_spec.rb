# frozen_string_literal: true

require 'rails_helper'
require 'tmpdir'

# rubocop:disable Rails/SkipsModelValidations
RSpec.describe ArchiveAttachmentsJob do
  # Shrine hands each subclass a copy of the storages hash (`storages.dup` in its
  # `inherited` hook), so the uploader needs registering too: Shrine.storages is
  # what cold_storage_keys reads, the uploader's copy is what the upload resolves.
  around do |example|
    Dir.mktmpdir do |dir|
      storage = Shrine::Storage::FileSystem.new(dir)
      Shrine.storages[:cold] = storage
      AttachmentUploader.storages[:cold] = storage
      example.run
    ensure
      Shrine.storages.delete(:cold)
      AttachmentUploader.storages.delete(:cold)
    end
  end

  def storage_of(record)
    record.reload.attachment_data['storage']
  end

  describe 'when no cold tier is configured' do
    before { create(:admin) }

    it 'emails the admin instead of crashing on a nil storage' do
      allow(Attachment).to receive(:cold_storage_keys).and_return([])

      expect { described_class.perform_now }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end
  end

  describe 'archiving one collection' do
    let(:collection) { create(:collection) }
    let(:sample) { create(:sample) }
    let!(:attachment) { create(:attachment, attachable: sample.container) }

    before { CollectionsSample.create!(collection: collection, sample: sample) }

    it 'archives a file whose element has not been edited since the threshold' do
      sample.update_column(:updated_at, 13.months.ago)

      expect(described_class.perform_now(collection.id)).to include(archived: 1)
      expect(storage_of(attachment)).to eq 'cold'
    end

    it 'leaves a file alone while its element is recent' do
      sample.update_column(:updated_at, 1.day.ago)

      described_class.perform_now(collection.id)

      expect(storage_of(attachment)).to eq 'store'
    end

    it 'leaves a recently read file alone even when its element is old' do
      sample.update_column(:updated_at, 13.months.ago)
      attachment.update_column(:last_accessed_at, 1.day.ago)

      described_class.perform_now(collection.id)

      expect(storage_of(attachment)).to eq 'store'
    end

    # Research plans hold their files directly, not through a container, so this
    # proves the loop is not sample-shaped.
    it 'archives a research plan attachment' do
      plan = create(:research_plan)
      CollectionsResearchPlan.create!(collection: collection, research_plan: plan)
      plan_attachment = create(:attachment, attachable: plan)
      plan.update_column(:updated_at, 13.months.ago)

      described_class.perform_now(collection.id)

      expect(storage_of(plan_attachment)).to eq 'cold'
    end

    it 'reports sub-collections and archives nothing from them' do
      child = create(:collection, parent: collection)
      child_sample = create(:sample)
      CollectionsSample.create!(collection: child, sample: child_sample)
      child_attachment = create(:attachment, attachable: child_sample.container)
      child_sample.update_column(:updated_at, 13.months.ago)

      result = described_class.perform_now(collection.id)

      expect(result[:children]).to eq [child.id]
      expect(storage_of(child_attachment)).to eq 'store'
    end

    it 'skips a row with no file instead of aborting the run' do
      sample.update_column(:updated_at, 13.months.ago)
      create(:attachment, attachable: sample.container).update_column(:attachment_data, nil)

      expect { described_class.perform_now(collection.id) }.not_to raise_error
      expect(storage_of(attachment)).to eq 'cold'
    end
  end

  describe 'archiving orphans (no collection id, how cron calls it)' do
    it 'archives an old attachment that was never attached to anything' do
      orphan = create(:attachment, attachable: nil)
      orphan.update_column(:updated_at, 13.months.ago)

      described_class.perform_now

      expect(storage_of(orphan)).to eq 'cold'
    end

    # root_element falls back to the uploader for these, and that date is no guide.
    it "ignores the uploading user's date" do
      uploader = create(:person)
      orphan = create(:attachment, attachable: nil, created_for: uploader.id)
      orphan.update_column(:updated_at, 13.months.ago)

      described_class.perform_now

      expect(orphan.reload.root_element).to eq uploader
      expect(storage_of(orphan)).to eq 'cold'
    end

    it 'archives an attachment whose parent was deleted' do
      sample = create(:sample)
      orphan = create(:attachment, attachable: sample.container)
      orphan.update_column(:updated_at, 13.months.ago)
      sample.container.destroy # soft delete, the attachment row stays behind

      described_class.perform_now

      expect(storage_of(orphan)).to eq 'cold'
    end

    it 'leaves an attachment whose parent is alive' do
      sample = create(:sample)
      attachment = create(:attachment, attachable: sample.container)
      attachment.update_column(:updated_at, 13.months.ago)
      sample.update_column(:updated_at, 13.months.ago)

      described_class.perform_now

      expect(storage_of(attachment)).to eq 'store'
    end

    # A file being uploaded right now also has no parent yet.
    it 'leaves a freshly created unattached attachment alone' do
      fresh = create(:attachment, attachable: nil)

      described_class.perform_now

      expect(storage_of(fresh)).to eq 'store'
    end

    it 'leaves an old orphan that was read recently' do
      orphan = create(:attachment, attachable: nil)
      orphan.update_column(:updated_at, 13.months.ago)
      orphan.update_column(:last_accessed_at, 1.day.ago)

      described_class.perform_now

      expect(storage_of(orphan)).to eq 'store'
    end
  end
end
# rubocop:enable Rails/SkipsModelValidations
