# frozen_string_literal: true

describe Usecases::Attachments::Annotation::AnnotationLoader do
  let(:loader) { described_class.new }
  let(:attachment_without_annotation) { create(:attachment) }
  let(:attachment_with_annotation) { create(:attachment, :with_png_image) }

  describe '.get_annotation_of_attachment()' do
    let(:annotation) { loader.get_annotation_of_attachment(attachment_id) }

    context 'when attachment does not exist' do
      let(:attachment_id) { -1 }

      it 'raised an error' do
        expect { annotation }.to raise_error(
          "Couldn't find Attachment with 'id'=#{attachment_id} [WHERE \"attachments\".\"deleted_at\" IS NULL]",
        )
      end
    end

    context 'when attachment can not have annotation' do
      let(:attachment_id) { attachment_without_annotation.id }

      it 'raised an error' do
        expect { annotation }.to raise_error 'could not find annotation of attachment'
      end
    end

    context 'when attachment has not yet an annotation (migration issue)' do
      let(:attachment_no_annotation_yet) { create(:attachment, :with_png_image) }
      let(:attachment_id) { attachment_no_annotation_yet.id }

      before do
        attachment_no_annotation_yet.attachment_data['derivatives'].delete('annotation')
        attachment_no_annotation_yet.update_column('attachment_data', attachment_no_annotation_yet.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'empty annotation was created and returned' do
        expect(annotation).not_to be_nil
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
