# frozen_string_literal: true

# Class for loading an annotation of an attachment with the shrine infrastructure
module Usecases
  module Attachments
    module Annotation
      class AnnotationLoader
        def get_annotation_of_attachment(attachment_id)
          att = Attachment.find(attachment_id)
          raise 'could not find annotation of attachment' if annotation_json_absent(att.attachment_data)

          location_of_annotation = att.attachment_data['derivatives']['annotation']['id']
          back = File.open(location_of_annotation, 'rb') if File.exist?(location_of_annotation)
          raise 'could not find annotation of attachment (file not found)' unless back

          back.read
        end

        def annotation_json_absent(attachment_data)
          !attachment_data ||
            !attachment_data['derivatives'] ||
            !attachment_data['derivatives']['annotation'] ||
            !attachment_data['derivatives']['annotation']['id']
        end
      end
    end
  end
end
