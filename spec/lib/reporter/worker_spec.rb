# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reporter::Worker do
  let(:report) { create(:report) }
  let(:worker) { described_class.new({ report: report }) }
  let(:expected_attachment) { Attachment.find_by(filename: 'ELN_Report.docx') }

  describe '.create_attachment' do
    context 'when no objects are selected' do
      before do
        # bypass private accessor
        worker.send(:create_attachment, Tempfile.new)
      end

      it 'attachment was created' do
        expect(expected_attachment).not_to be_nil
      end

      it 'file was attached' do
        expect(expected_attachment.attachment_data).not_to be_nil
      end
    end
  end
end
