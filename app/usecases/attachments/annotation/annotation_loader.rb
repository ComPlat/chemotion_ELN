# frozen_string_literal: true

# Class for loading an annotation of an attachment with the shrine infrastructure
module Usecases
  module Attachments
    module Annotation
      class AnnotationLoader
        def get_annotation_of_attachment(attachment_id) # rubocop:disable Metrics/AbcSize
          att = Attachment.find(attachment_id)
          raise 'could not find attachment' unless att
          raise 'could not find annotation of attachment' unless annotatable?(att.attachment_data)

          create_empty_annotation(att) unless annotation_json_present(att.attachment_data)

          location_of_annotation = att.attachment_data['derivatives']['annotation']['id']
          annotation = File.open(location_of_annotation, 'rb') if File.exist?(location_of_annotation)
          raise 'could not find annotation of attachment (file not found)' unless annotation

          annotation.read
        end

        def annotation_json_present(data)
          data['derivatives']['annotation'] &&
            data['derivatives']['annotation']['id']
        end

        def annotatable?(data)
          data && data['derivatives']
        end

        def create_empty_annotation(att) # rubocop:disable Metrics/AbcSize
          Usecases::Attachments::Annotation::AnnotationCreator.new.create_derivative(
            '.', File.open(att.attachment_data['id']), att.id, {}, nil
          )

          file_location = att.attachment_data['id']
          att.attachment_data['derivatives']['annotation'] = {}
          att.attachment_data['derivatives']['annotation']['id'] =
            "#{file_location.gsub(File.extname(file_location), '')}.annotation.svg"
          att.update_column('attachment_data', att.attachment_data) # rubocop:disable Rails/SkipsModelValidations
        end
      end
    end
  end
end
