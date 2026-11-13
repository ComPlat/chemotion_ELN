# frozen_string_literal: true

module Usecases
  module Attachments
    class Copy
      class Error < StandardError; end
      class InvalidInput < Error; end
      class Forbidden < Error; end
      class QuotaExceeded < Error; end

      QUOTA_MESSAGE = 'Not enough storage space to copy the attachments. ' \
                      'Free up space or copy the plan without them.'

      attr_reader :attachments_omitted

      def self.execute!(attachments, element, current_user, source_plan_id: nil)
        new(attachments, current_user, source_plan_id: source_plan_id).transaction { |copy| copy.execute!(element) }
      end

      # Public compatibility entry point used by Labimotion's attachment handler.
      def self.update_annotation(original_attach, copy_attach_id)
        original_attach = Attachment.find(original_attach) unless original_attach.is_a?(Attachment)
        # PDFs can have thumbnails without carrying an annotation derivative.
        return if original_attach.attachment(:annotation).blank?

        loader = Usecases::Attachments::Annotation::AnnotationLoader.new
        svg = loader.get_annotation_of_attachment(original_attach.id)

        updater = Usecases::Attachments::Annotation::AnnotationUpdater.new
        updater.updated_annotated_string(svg, copy_attach_id)
      end

      def initialize(attachments, current_user, source_plan_id: nil)
        @entries = validated_entries(attachments)
        @deleted_ids = @entries.select { |entry| entry[:is_deleted] }.pluck(:id).map(&:to_s)
        @current_user = current_user
        @access = Access.new(current_user)
        @source_plan = authorized_source(source_plan_id)
        @copy_all = attachments.nil? && @source_plan.present?
        @created_files = []
        @attachments_omitted = false
      end

      # The caller includes plan creation and collection membership in this transaction.
      def transaction
        @created_files.clear
        ApplicationRecord.transaction(requires_new: true) { yield self }
      rescue StandardError
        cleanup_created_files
        raise
      ensure
        @created_files.clear
      end

      def execute!(element)
        @attachments_omitted = false
        originals = find_originals(element)
        sources = stored_sources(readable_sources(originals[:by_id]))
        ensure_quota!(sources)

        replacements = sources.to_h do |source|
          [source.identifier, copy_attachment(source, element).identifier]
        end
        return unless element.instance_of?(::ResearchPlan)

        remove_skipped_body_images(element, originals, replacements)
        element.update_body_attachments(replacements)
      end

      private

      def authorized_source(id)
        return if id.nil?

        source = ResearchPlan.find_by(id: id)
        raise Forbidden unless ElementPolicy.new(@current_user, source).copy?

        source
      end

      def readable_source?(attachment)
        source_attachment?(attachment) && @access.read?(attachment)
      end

      def source_attachment?(attachment)
        @source_plan.present? && attachment&.attachable_type == 'ResearchPlan' &&
          attachment.attachable_id == @source_plan.id
      end

      def validated_entries(attachments)
        attachments ||= []
        unless attachments.is_a?(Array) && attachments.all? { |entry| valid_entry?(entry) }
          raise InvalidInput, 'Attachments must be an array of attachment objects'
        end

        attachments.map(&:with_indifferent_access)
      end

      def readable_sources(originals)
        return all_readable_sources(originals) if @copy_all

        @entries.reject { |entry| entry[:is_new] || @deleted_ids.include?(entry[:id].to_s) }
                .filter_map do |entry|
          attachment = originals[entry[:id].to_s]
          if readable_source?(attachment)
            attachment
          else
            @attachments_omitted = true
            nil
          end
        end.uniq
      end

      def all_readable_sources(originals)
        candidates = originals.values.select { |attachment| source_attachment?(attachment) }
        readable = candidates.select { |attachment| readable_source?(attachment) }
        @attachments_omitted ||= readable.size < candidates.size
        readable
      end

      # Legacy rows can lack a stored file; leave them out like unreadable ones.
      def stored_sources(sources)
        stored = sources.select { |attachment| attachment.attachment&.exists? }
        @attachments_omitted ||= stored.size < sources.size
        stored
      end

      # Mirrors Attachment#user_quota_exceeded? for the whole batch, before any file is written.
      def ensure_quota!(sources)
        return if sources.empty?

        used, allocated = User.where(id: @current_user.id).pick(:used_space, :allocated_space)
        return if allocated.to_i.zero?

        needed = sources.sum { |attachment| attachment.attachment.size.to_i }
        raise QuotaExceeded, QUOTA_MESSAGE if used.to_i + needed > allocated
      end

      def valid_entry?(entry)
        return false unless entry.is_a?(Hash)

        entry = entry.with_indifferent_access
        [nil, true, false].include?(entry[:is_new]) && [nil, true, false].include?(entry[:is_deleted]) &&
          (entry[:id].nil? || entry[:id].is_a?(String) || entry[:id].is_a?(Integer))
      end

      def find_originals(element)
        identifiers = if element.instance_of?(::ResearchPlan)
                        Array(element.body).filter_map do |field|
                          field.dig('value', 'public_name') if field['type'] == 'image'
                        end
                      else
                        []
                      end
        scope = @source_plan ? Attachment.where(attachable: @source_plan) : Attachment.none
        scope = scope.where(id: @entries.reject { |entry| entry[:is_new] }.pluck(:id)) unless @copy_all
        rows = scope.or(Attachment.where(identifier: identifiers.grep(String))).to_a
        { by_id: rows.index_by { |attachment| attachment.id.to_s }, by_identifier: rows.index_by(&:identifier) }
      end

      def copy_attachment(original, element)
        copy = Attachment.new(attachable: element, created_by: @current_user.id, created_for: @current_user.id,
                              filename: original.filename)
        copy.save!
        @created_files << [copy.identifier, (copy.id / 10_000) + 1]
        original.attachment.open do |io|
          copy.file_path = io.path
          copy.save!
        end
        # Finish storage writes before committing the plan, including its annotation.
        copy.attachment_attacher.finalize
        copy.save!
        self.class.update_annotation(original, copy.id)
        copy
      rescue StandardError => e
        # Space can still run out mid-copy, e.g. through a concurrent upload.
        raise QuotaExceeded, QUOTA_MESSAGE, cause: e if e.message == 'User quota exceeded'

        raise Error, 'Unable to copy attachment files', cause: e
      end

      def remove_skipped_body_images(element, originals, replacements)
        deleted = @deleted_ids.filter_map { |id| originals[:by_id][id]&.identifier }
        element.body = element.body&.reject do |field|
          skipped_body_image?(field, deleted, originals[:by_identifier], element, replacements)
        end
      end

      def skipped_body_image?(field, deleted, originals, element, replacements)
        return false unless field['type'] == 'image'

        identifier = field.dig('value', 'public_name')
        unreadable = unreadable_body_image?(identifier, originals, element, replacements.keys + deleted)
        @attachments_omitted ||= unreadable
        unreadable || deleted.include?(identifier)
      end

      def unreadable_body_image?(identifier, originals, element, permitted_source_images)
        return false if identifier.blank?
        return true unless identifier.is_a?(String)
        return false if ResearchPlan.legacy_image_filename?(identifier)

        # The browser uploads new images only after the plan has been created.
        return false unless originals.key?(identifier)

        !permitted_body_attachment?(originals[identifier], element, permitted_source_images)
      end

      def permitted_body_attachment?(attachment, element, permitted_source_images)
        return false unless @access.read?(attachment)
        return true if attachment.attachable_id.nil?
        return permitted_source_images.include?(attachment.identifier) if readable_source?(attachment)

        attachment.root_element == element
      end

      def cleanup_created_files
        # Include annotation side files and partially uploaded derivatives. Every path is
        # restricted to a UUID generated for a new copy and its storage bucket.
        @created_files.each do |identifier, bucket|
          cleanup_copy(identifier, bucket)
        end
      end

      def cleanup_copy(identifier, bucket)
        # An unrelated after_commit callback can raise after the database committed.
        # Keep the files of copies that are still persisted.
        return if Attachment.exists?(identifier: identifier)

        Shrine.storages.each_value do |storage|
          next unless storage.is_a?(Shrine::Storage::FileSystem)

          Dir.glob(storage.directory.join(bucket.to_s, "#{identifier}{,.*,_*}")).each { |path| FileUtils.rm_f(path) }
        end
      rescue StandardError => e
        Rails.logger.error("Unable to clean up copied attachment #{identifier}: #{e.message}")
      end
    end
  end
end
