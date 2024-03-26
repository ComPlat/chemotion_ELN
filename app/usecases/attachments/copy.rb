# frozen_string_literal: true

module Usecases
  module Attachments
    class Copy
      def self.execute!(attachments, element, current_user_id)
        attachments.each do |attach|
          original_attach = Attachment.find attach[:id]
          copy_attach = Attachment.new(
            attachable_id: element.id,
            attachable_type: element.class.name,
            created_by: current_user_id,
            created_for: current_user_id,
            filename: original_attach.filename,
          )
          copy_attach.save

          copy_io = original_attach.attachment_attacher.get.to_io
          attacher = copy_attach.attachment_attacher
          attacher.attach copy_io
          copy_attach.file_path = copy_io.path
          copy_attach.save

          update_annotation(original_attach.id, copy_attach.id)

          if element.instance_of?(::ResearchPlan)
            element.update_body_attachments(original_attach.identifier, copy_attach.identifier)
          end
        end
      end

      def self.update_annotation(original_attach_id, copy_attach_id)
        loader = Usecases::Attachments::Annotation::AnnotationLoader.new
        svg = loader.get_annotation_of_attachment(original_attach_id)

        updater = Usecases::Attachments::Annotation::AnnotationUpdater.new
        updater.updated_annotated_string(svg, copy_attach_id)
      end
    end
  end
end
