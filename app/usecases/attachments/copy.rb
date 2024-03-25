# frozen_string_literal: true

module Usecases
  module Attachments
    class Copy
      def self.execute!(attachments, element, current_user_id)
        attachments.each do |attach|
          old_attach = Attachment.find attach[:id]
          new_attach = Attachment.new(
            attachable_id: element.id,
            attachable_type: element.class.name,
            created_by: current_user_id,
            created_for: current_user_id,
            key: SecureRandom.uuid,
            identifier: nil,
            filename: old_attach.filename,
          )
          new_attach.save

          copy_io = old_attach.attachment_attacher.get.to_io
          attacher = new_attach.attachment_attacher
          attacher.attach copy_io
          new_attach.file_path = copy_io.path
          new_attach.save

          update_annotation(old_attach.id, new_attach.id)

          if element.instance_of?(::ResearchPlan)
            element.update_body_attachments(old_attach.identifier, new_attach.identifier)
          end
        end
      end

      def self.update_annotation(old_attach_id, new_attach_id)
        loader = Usecases::Attachments::Annotation::AnnotationLoader.new
        svg = loader.get_annotation_of_attachment(old_attach_id)

        updater = Usecases::Attachments::Annotation::AnnotationUpdater.new
        updater.updated_annotated_string(svg, new_attach_id)
      end
    end
  end
end
