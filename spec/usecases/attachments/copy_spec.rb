# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Attachments::Copy do
  let(:user) { create(:user) }
  let(:research_plan) { create(:research_plan) }

  describe '.execute!' do
    let(:attachments) { [{ id: source.id }] }

    before do
      described_class.execute!(attachments, research_plan, user.id)
    end

    context 'when the attachment is a non-annotatable file (e.g. PDF)' do
      # A PDF gets a :thumbnail derivative but never an :annotation derivative.
      # Regression for NoMethodError: undefined method `url' for nil:NilClass
      # raised from AnnotationLoader when copying a research plan (Sentry).
      let(:source) { create(:attachment, :with_pdf, attachable: research_plan) }

      it 'copies the attachment without attempting to copy an annotation' do
        copy = Attachment.where(attachable: research_plan).where.not(id: source.id).last

        expect(copy).to be_present
        expect(copy.filename).to eq(source.filename)
        expect(copy.attachment(:annotation)).to be_nil
      end
    end

    context 'when the attachment is an annotatable image' do
      let(:source) { create(:attachment, :with_png_image, attachable: research_plan) }

      it 'copies the attachment and its annotation derivative' do
        copy = Attachment.where(attachable: research_plan).where.not(id: source.id).last

        expect(copy).to be_present
        expect(copy.attachment(:annotation)).to be_present
      end
    end
  end
end
