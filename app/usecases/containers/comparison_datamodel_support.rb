# frozen_string_literal: true

module Usecases
  module Containers
    # Handles spectra comparison container updates (dataset + combined image) when
    # `analyses_compared` changes. Extracted to keep `UpdateDatamodel` within RuboCop limits.
    class ComparisonDatamodelSupport
      class << self
        def parse_analyses_compared(raw)
          case raw
          when String
            begin
              JSON.parse(raw.gsub('=>', ':'))
            rescue StandardError
              nil
            end
          when Array
            raw
          end
        end

        def analyses_already_in_same_dataset?(container, analyses_compared)
          file_ids = analyses_compared.filter_map { |e| e.dig('file', 'id') }
          return false if file_ids.empty?

          first_dataset_id = nil
          file_ids.each do |fid|
            parent = dataset_child_parent_for_file(container, fid)
            return false unless parent

            if first_dataset_id.nil?
              first_dataset_id = parent.id
            elsif first_dataset_id != parent.id
              return false
            end
          end

          true
        end

        def dataset_child_parent_for_file(container, file_id)
          att = Attachment.find_by(id: file_id)
          return nil unless att&.attachable_type == 'Container'

          parent = Container.find_by(id: att.attachable_id)
          return nil unless parent && parent.container_type == 'dataset' && parent.parent_id == container.id

          parent
        end
        private :dataset_child_parent_for_file

        # rubocop:disable Metrics/AbcSize, Metrics/BlockLength, Metrics/MethodLength
        def generate_comparison_dataset!(container, analyses_compared)
          list_file = []
          list_file_names = []
          combined_image_filename = 'combined_image.png'
          created_by_user = -1

          dataset_child = container.children.create(
            name: "Comparison #{Time.current.strftime('%Y-%m-%d %H:%M:%S')}",
            container_type: 'dataset',
          )
          target_id = dataset_child.id
          new_analyses_compared_list = []

          analyses_compared.each do |entry|
            attachment = Attachment.find_by(id: entry.dig('file', 'id'))
            next unless attachment

            created_by_user = attachment.created_by
            base = File.basename(attachment.filename, '.*')
            base_no_compared = base.sub(/_compared_[0-9:-]+\z/, '')
            ts = Time.current.strftime('%Y-%m-%d-%H:%M:%S')
            new_filename = "#{base_no_compared}_compared_#{ts}#{File.extname(attachment.filename)}"

            original_path = attachment.abs_path
            next unless File.exist?(original_path)

            temp_file = Tempfile.new([base, File.extname(attachment.filename)])
            FileUtils.cp(original_path, temp_file.path)

            new_att = Attachment.new(
              filename: new_filename,
              created_by: created_by_user,
              created_for: created_by_user,
              attachable_type: 'Container',
              attachable_id: target_id,
              file_path: temp_file.path,
            )
            new_att.save!

            list_file_names << new_att.filename
            list_file << new_att.abs_path

            new_entry = entry.dup
            new_entry['file'] = { 'id' => new_att.id }
            new_entry['dataset'] = { 'id' => target_id }
            new_entry['analysis'] = { 'id' => target_id }
            new_analyses_compared_list << new_entry
          end

          container.extended_metadata['analyses_compared'] = new_analyses_compared_list
          # rubocop:disable Rails/SkipsModelValidations -- bulk update of JSON metadata; callbacks not required
          container.update_column(:extended_metadata, container.extended_metadata)
          # rubocop:enable Rails/SkipsModelValidations

          return if list_file.empty?

          _, image = Chemotion::Jcamp::CombineImg.combine(list_file, 0, list_file_names, nil)
          return if image.blank?

          old = Attachment.find_by(filename: combined_image_filename, attachable_id: target_id)
          old&.destroy!

          Attachment.create!(
            filename: combined_image_filename,
            created_by: created_by_user,
            created_for: created_by_user,
            file_path: image.path,
            attachable_type: 'Container',
            attachable_id: target_id,
            thumb: true,
          )
        end
        # rubocop:enable Metrics/AbcSize, Metrics/BlockLength, Metrics/MethodLength
      end
    end
  end
end
