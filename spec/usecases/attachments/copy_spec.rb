# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Attachments::Copy do
  let(:user) { create(:user) }
  let(:research_plan) { create(:research_plan) }
  let(:collection) { create(:collection, user: user) }
  let(:source_plan) { create(:research_plan, collections: [collection]) }

  describe '.execute!' do
    let(:attachments) { [{ id: source.id }] }

    before do
      described_class.execute!(attachments, research_plan, user.id)
    end

    context 'when the attachment ID does not exist' do
      let(:attachments) { [{ id: -1 }] }

      it 'skips the missing attachment' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is a non-annotatable file (e.g. PDF)' do
      # A PDF gets a :thumbnail derivative but never an :annotation derivative.
      # Regression for NoMethodError: undefined method `url' for nil:NilClass
      # raised from AnnotationLoader when copying a research plan (Sentry).
      let(:source) { create(:attachment, :with_pdf, attachable: source_plan) }

      it 'copies the attachment without attempting to copy an annotation' do
        copy = Attachment.where(attachable: research_plan).where.not(id: source.id).last

        expect(copy).to be_present
        expect(copy.filename).to eq(source.filename)
        expect(copy.attachment(:annotation)).to be_nil
      end
    end

    context 'when the attachment is an annotatable image' do
      let(:source) { create(:attachment, :with_png_image, attachable: source_plan) }

      it 'copies the attachment and its annotation derivative' do
        copy = Attachment.where(attachable: research_plan).where.not(id: source.id).last

        expect(copy).to be_present
        expect(copy.attachment(:annotation)).to be_present
      end
    end

    context 'when the source research plan is not readable' do
      let(:collection) { create(:collection) }
      let(:source) { create(:attachment, :with_png_image, attachable: source_plan, created_for: user.id) }

      it 'does not copy the attachment even if it was uploaded for the current user' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is in an unreadable analysis container' do
      let(:sample) { create(:sample, collections: [create(:collection)]) }
      let(:source) do
        create(:attachment, attachable: create(:container, containable: sample), created_for: user.id)
      end

      it 'does not copy the attachment' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is unattached and belongs to another user' do
      let(:source) { create(:attachment, attachable: nil, created_for: create(:user).id, created_by: user.id) }

      it 'does not copy the attachment' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is unattached and belongs to the current user' do
      let(:source) { create(:attachment, attachable: nil, created_for: user.id) }

      it 'copies the attachment' do
        copy = research_plan.attachments.take!

        expect(copy.read_file).to eq(source.read_file)
        expect([copy.created_by, copy.created_for]).to eq([user.id, user.id])
      end
    end
  end
end
