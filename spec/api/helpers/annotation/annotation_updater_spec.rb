# frozen_string_literal: true

require 'helpers/annotation/annotation_updater'
require_relative 'annotation_helper.rb'

describe AnnotationUpdater do
  context 'with AnnotationUpdater' do
    describe '-> update annotation' do
      it '-> of non existing attachment' do
        expect do
          helper = described_class.new
          helper.update_annotation('', 1)
        end.to raise_error "Couldn't find Attachment with 'id'=1"
      end

      it '-> success' do
        helper = AnnotationHelper.new
        example_svg_annotation = '<svg>example</svg>'
        tempfile = Tempfile.new('annotationFile.svg')
        tempfile.write(example_svg_annotation)
        tempfile.rewind
        tempfile.close
        attachment = helper.createAttachmentWithAnnotation(tempfile.path)
        attachment.save
        helper = described_class.new
        helper.update_annotation('<svg>edited - example</svg>', attachment.id)

        file = File.open(attachment.attachment_data['derivatives']['annotation']['id'])
        data = file.read
        assert_equal('<svg>edited - example</svg>', data)

        tempfile.unlink
      end
    end
  end
end
