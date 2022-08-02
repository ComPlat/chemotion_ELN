# frozen_string_literal: true

require "rails_helper"

class AttachmentProcessTest
  def filename
    @filename
  end

  def attachable_id
    @attachable_id = 1
  end

  def created_by
    @created_by = 1
  end

  def created_for
    @created_for = 1
  end
end

RSpec.describe AttachmentJcampAasm do

  file_name_to_be_generated = "test"

  describe 'generate attachments' do
    att_jcamp_process = AttachmentProcessTest.new
    att_jcamp_process.extend(AttachmentJcampAasm)
    att_jcamp_process.extend(AttachmentJcampProcess)

    context 'generate in gerenal' do
      before do
        @tempfile = Tempfile.new(file_name_to_be_generated)
      end

      it 'cannot generate when meta data is nil' do
        attachment = att_jcamp_process.generate_att(nil, "peak")
        expect(attachment).to eq(nil)
      end

      it 'generate jcamp' do
        attachment = att_jcamp_process.generate_att(@tempfile, "peak", false, "jdx")
        expect(attachment).to be_truthy
        expect(attachment.non_jcamp?).to eq(false)
        expect(attachment.attachable_id).to eq(att_jcamp_process.attachable_id)
        expect(attachment.created_for).to eq(att_jcamp_process.created_for)
        expect(attachment.created_by).to eq(att_jcamp_process.created_by)
      end

      it 'generate image' do
        attachment = att_jcamp_process.generate_att(@tempfile, "peak", false, "png")
        expect(attachment).to be_truthy
        expect(attachment.aasm_state).to eq("image")
      end

      it 'generate json' do
        attachment = att_jcamp_process.generate_att(@tempfile, "peak", false, "json")
        expect(attachment).to be_truthy
        expect(attachment.aasm_state).to eq("json")
      end

      it 'generate csv' do
        attachment = att_jcamp_process.generate_att(@tempfile, "peak", false, "csv")
        expect(attachment).to be_truthy
        expect(attachment.aasm_state).to eq("csv")
      end
    end

    context 'generate specific files' do
      before do
        @tempfile = Tempfile.new(file_name_to_be_generated)
      end

      it 'generate jcamp' do
        attachment = att_jcamp_process.generate_jcamp_att(@tempfile, "peak", false)
        expect(attachment).to be_truthy
        expect(attachment.non_jcamp?).to eq(false)
        expect(attachment.attachable_id).to eq(att_jcamp_process.attachable_id)
        expect(attachment.created_for).to eq(att_jcamp_process.created_for)
        expect(attachment.created_by).to eq(att_jcamp_process.created_by)
      end

      it 'generate image' do
        attachment = att_jcamp_process.generate_img_att(@tempfile, "peak", false)
        expect(attachment).to be_truthy
        expect(attachment.aasm_state).to eq("image")
      end

      it 'generate json' do
        attachment = att_jcamp_process.generate_json_att(@tempfile, "peak", false,)
        expect(attachment).to be_truthy
        expect(attachment.aasm_state).to eq("json")
      end

      it 'generate csv' do
        attachment = att_jcamp_process.generate_csv_att(@tempfile, "peak", false)
        expect(attachment).to be_truthy
        expect(attachment.aasm_state).to eq("csv")
      end

    end
  end

end
