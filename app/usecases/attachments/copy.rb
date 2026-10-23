# frozen_string_literal: true

module Usecases
  module Attachments
    class Copy
      def self.execute!(attachments, element, current_user_id)
        access = Usecases::Attachments::Access.new(User.find(current_user_id))
        remove_unreadable_body_images(element, access)

        attachments.each do |attach|
          original_attach = Attachment.find_by(id: attach[:id])
          next unless access.read?(original_attach)

          copy_attachment(original_attach, element, current_user_id)
        end
      end

      def self.copy_attachment(original_attach, element, current_user_id)
        copy_attach = Attachment.new(
          attachable: element,
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

        update_annotation(original_attach, copy_attach.id)

        return unless element.instance_of?(::ResearchPlan)

        element.update_body_attachments(original_attach.identifier, copy_attach.identifier)
      end

      def self.remove_unreadable_body_images(element, access)
        return unless element.instance_of?(::ResearchPlan) && element.body.present?

        body = element.body.reject do |field|
          field['type'] == 'image' && unreadable_body_image?(field, access)
        end
        element.update!(body: body) if body != element.body
      end

      def self.unreadable_body_image?(field, access)
        public_name = field.dig('value', 'public_name')
        return false if public_name.blank?
        return true unless public_name.is_a?(String)
        return false if public_name.match?(/\A[\w-]+\.\w+\z/) # Legacy public-image filenames.

        !access.read?(Attachment.find_by(identifier: public_name))
      end

      private_class_method :copy_attachment, :remove_unreadable_body_images, :unreadable_body_image?

      def self.update_annotation(original_attach, copy_attach_id)
        # Only image attachments carry an :annotation derivative. For PDFs and other
        # non-annotatable files it is nil, and the loader would raise NoMethodError
        # ("undefined method `url' for nil"), aborting the whole research-plan copy.
        return if original_attach.attachment(:annotation).blank?

        loader = Usecases::Attachments::Annotation::AnnotationLoader.new
        svg = loader.get_annotation_of_attachment(original_attach.id)

        updater = Usecases::Attachments::Annotation::AnnotationUpdater.new
        updater.updated_annotated_string(svg, copy_attach_id)
      end
    end
  end
end
