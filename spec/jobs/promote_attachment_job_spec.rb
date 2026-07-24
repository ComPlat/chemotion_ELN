# frozen_string_literal: true

# update_column is the house idiom for back-dating timestamps in these specs.
# rubocop:disable Rails/SkipsModelValidations
RSpec.describe PromoteAttachmentJob do
  it 'moves a cold attachment back to the hot storage tier' do
    attachment = create(:attachment)
    attachment.update_column(:updated_at, 13.months.ago)
    attachment.attachable.update_column(:updated_at, 13.months.ago)
    attachment.move_to_cold

    described_class.perform_now(attachment.id)

    expect(attachment.reload.attachment.storage_key).to eq(:store)
  end

  it 'does nothing for an attachment that no longer exists' do
    expect { described_class.perform_now(-1) }.not_to raise_error
  end
end
# rubocop:enable Rails/SkipsModelValidations
