# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20261004200000_repair_conversion_derivatives.rb').to_s

RSpec.describe 'migration 20261004200000: RepairConversionDerivatives' do # rubocop:disable RSpec/DescribeClass
  # The TIFF factory builds derivatives through AttachmentUploader, whose temp file can be
  # garbage-collected under the converter (see repair_conversion_derivatives_task_spec.rb).
  around do |example|
    GC.disable
    example.run
  ensure
    GC.enable
  end

  let(:container) { create(:container) }
  let(:attachment) { create(:attachment, :with_tif_file, attachable: container) }

  before do
    entry = attachment.attachment_data.dig('derivatives', 'conversion')
    # the entry an earlier LoadImage wrote: only an id, with a leading slash
    attachment.attachment_data['derivatives']['conversion'] = { 'id' => "/#{entry['id']}" }
    attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'leaves an attachment the entity can serialize again' do
    expect { Entities::AttachmentEntity.represent(Attachment.find(attachment.id)).as_json }
      .to raise_error(Shrine::Error)

    RepairConversionDerivatives.new.up

    json = Entities::AttachmentEntity.represent(Attachment.find(attachment.id)).as_json
    expect(json).to include(id: attachment.id, previewable: true)
  end

  it 'is idempotent' do
    RepairConversionDerivatives.new.up

    expect(RepairConversionDerivativesTask.execute!(dry_run: true)).to be_empty
  end
end
