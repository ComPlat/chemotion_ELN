# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RepairConversionDerivativesTask do
  # AttachmentUploader.create_tmp_file returns only the Tempfile's path, so a GC run while the
  # TIFF factory builds its derivatives can delete the file under the converter (ENOENT).
  # Keep GC off while these examples create TIFF attachments.
  around do |example|
    GC.disable
    example.run
  ensure
    GC.enable
  end

  let(:attachment) { create(:attachment, :with_tif_file) }
  let(:valid_entry) { attachment.attachment_data.dig('derivatives', 'conversion') }

  # The entry an earlier LoadImage wrote: only an id, with a leading slash.
  def break_conversion_entry(record)
    record.attachment_data['derivatives']['conversion'] = { 'id' => "/#{valid_entry['id']}" }
    record.update_column('attachment_data', record.attachment_data) # rubocop:disable Rails/SkipsModelValidations
  end

  before do
    valid_entry
    break_conversion_entry(attachment)
  end

  it 'finds only attachments with a conversion entry Shrine cannot load' do
    healthy = create(:attachment, :with_tif_file)
    ids = described_class.broken_attachments.pluck(:id)

    expect(ids).to include(attachment.id)
    expect(ids).not_to include(healthy.id)
  end

  context 'with dry_run: true (default)' do
    it 'reports the repair but writes nothing' do
      results = described_class.execute!

      expect(results.map(&:action)).to eq([:rewritten])
      expect(Attachment.find(attachment.id).attachment_data.dig('derivatives', 'conversion'))
        .to eq('id' => "/#{valid_entry['id']}")
    end
  end

  context 'with dry_run: false' do
    it 'rewrites the entry so Shrine can load the derivatives again' do
      described_class.execute!(dry_run: false)
      repaired = Attachment.find(attachment.id)

      expect(repaired.attachment_data.dig('derivatives', 'conversion'))
        .to include('id' => valid_entry['id'], 'storage' => 'store')
      expect(repaired.attachment_attacher.derivatives[:conversion].exists?).to be true
      expect(described_class.broken_attachments.pluck(:id)).not_to include(attachment.id)
    end

    it 'removes the entry when the converted file is gone, so the next preview converts again' do
      File.delete(attachment.attachment(:conversion).url)
      described_class.execute!(dry_run: false)
      repaired = Attachment.find(attachment.id)

      expect(repaired.attachment_data['derivatives']).not_to have_key('conversion')
      expect(Usecases::Attachments::LoadImage.execute!(repaired, false).bytesize).to be > 0
    end
  end
end
