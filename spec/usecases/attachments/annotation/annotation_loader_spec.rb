# frozen_string_literal: true
require_relative 'annotation_helper'

describe Usecases::Attachments::Annotation::AnnotationLoader do
  let(:loader) { described_class.new }
  let(:attachment_without_annotation) { create(:attachment) }
  let(:attachment_with_annotation) { create(:attachment, :with_png_image) }

  describe '.get_annotation_of_attachment()' do
    let(:annotation) { loader.get_annotation_of_attachment(attachment_id) }

    context 'when attachment does not exist' do
      let(:attachment_id) { -1 }

      it 'raised an error' do
        expect { annotation }.to raise_error "Couldn't find Attachment with 'id'=#{attachment_id}"
      end
    end

    context 'when attachment has no annotation' do
      let(:attachment_id) { attachment_without_annotation.id }

      it 'raised an error' do
        expect { annotation }.to raise_error 'could not find annotation of attachment'
      end
    end

    context 'when attachment has annotation' do
      let(:attachment_id) { attachment_with_annotation.id }
      let(:annotation) { loader.get_annotation_of_attachment(attachment_id) }

      it 'successfully loaded annotation' do
        expect(annotation).not_to be_nil
      end
    end
  end
end
