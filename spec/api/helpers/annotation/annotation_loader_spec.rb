# frozen_string_literal: true

require 'helpers/annotation/annotation_loader'
require_relative 'annotation_helper.rb'

describe AnnotationLoader do
  context 'with AnnotationLoader' do
    describe '-> load annotation' do
      it '-> of non existing attachment' do
        expect do
          loader = described_class.new
          loader.get_annotation_of_attachment(1)
        end.to raise_error "Couldn't find Attachment with 'id'=1"
      end

      it '-> of attachment without annotation' do
        expect do
          helper = AnnotationHelper.new
          attachment = helper.createAttachmentWithoutAnnotation
          attachment.save
          loader = described_class.new
          loader.get_annotation_of_attachment(attachment.id)
        end.to raise_error 'could not find annotation of attachment'
      end

      it '-> of attachment with annotation but without file' do
        expect do
          helper = AnnotationHelper.new
          attachment = helper.createAttachmentWithAnnotation('/nothingHere/xxx.svg')
          attachment.save
          loader = described_class.new
          loader.get_annotation_of_attachment(attachment.id)
        end.to raise_error 'could not find annotation of attachment (file not found)'
      end

      it '-> of attachment with annotation and file' do
        helper = AnnotationHelper.new
        example_svg_annotation = '<svg>example</svg>'
        tempfile = Tempfile.new('annotationFile.svg')
        tempfile.write(example_svg_annotation)
        tempfile.rewind
        tempfile.close
        attachment = helper.createAttachmentWithAnnotation(tempfile.path)
        attachment.save
        loader = described_class.new
        svg_data = loader.get_annotation_of_attachment(attachment.id)
        assert_equal(example_svg_annotation, svg_data)
        tempfile.unlink
      end
    end
  end
end
