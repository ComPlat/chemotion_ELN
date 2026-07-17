# frozen_string_literal: true

# update_column is the house idiom for back-dating timestamps in these specs.
# rubocop:disable Rails/SkipsModelValidations
RSpec.describe ArchiveColdAttachmentsJob do
  let(:threshold) { 12.months.ago }

  it 'moves cold attachments (old file + old parent) to cold storage' do
    attachment = create(:attachment)
    attachment.update_column(:updated_at, 13.months.ago)
    attachment.attachable.update_column(:updated_at, 13.months.ago)

    described_class.perform_now(older_than: threshold)

    expect(attachment.reload.attachment.storage_key).to eq(:cold)
  end

  it 'does not move attachments that are not cold' do
    attachment = create(:attachment)
    attachment.update_column(:updated_at, 1.day.ago)

    described_class.perform_now(older_than: threshold)

    expect(attachment.reload.attachment.storage_key).not_to eq(:cold)
  end

  it 'skips attachments already in cold storage' do
    attachment = create(:attachment)
    attachment.update_column(:updated_at, 13.months.ago)
    attachment.attachable.update_column(:updated_at, 13.months.ago)
    attachment.move_to_cold

    expect_any_instance_of(Attachment).not_to receive(:move_to_cold) # rubocop:disable RSpec/AnyInstance

    described_class.perform_now(older_than: threshold)
  end

  it 'does not move anything in dry-run mode' do
    attachment = create(:attachment)
    attachment.update_column(:updated_at, 13.months.ago)
    attachment.attachable.update_column(:updated_at, 13.months.ago)

    described_class.perform_now(older_than: threshold, dry_run: true)

    expect(attachment.reload.attachment.storage_key).not_to eq(:cold)
  end

  it 'defaults to a 12-month threshold when called with no arguments (so cron can run it)' do
    attachment = create(:attachment)
    attachment.update_column(:updated_at, 13.months.ago)
    attachment.attachable.update_column(:updated_at, 13.months.ago)

    described_class.perform_now

    expect(attachment.reload.attachment.storage_key).to eq(:cold)
  end
end
# rubocop:enable Rails/SkipsModelValidations
