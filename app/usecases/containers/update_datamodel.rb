# frozen_string_literal: true

module Usecases
  module Containers
    class UpdateDatamodel
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
      end

      def update_datamodel(container)
        # TODO: check this logic, not sure this is still needed + containable_type should not be null
        root_container = if container[:is_new]
                           Container.create(
                             # name: "root",
                             container_type: container[:containable_type], # should be 'root'
                           )
                         else
                           Container.find_by id: container[:id]
                           # root_container.name = "root" #if it is created from client.side
                         end
        # root_container.save!
        # ODOT
        unless container[:description].nil? || root_container.nil?
          root_container[:description] = container[:description]
          root_container.save!
        end
        create_or_update_containers(container[:children], root_container, current_user) if container[:children].present?
        root_container
      end

      private

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
      # rubocop:disable Metrics/BlockLength
      def create_or_update_containers(children, parent_container, current_user = {})
        return unless children
        return unless can_update_container?(parent_container)

        children.each do |child|
          if child[:is_deleted]
            delete_containers_and_attachments(child) unless child[:is_new]
            next
          end

          extended_metadata = child[:extended_metadata]
          if child[:container_type] == 'analysis'
            extended_metadata['content'] = if extended_metadata.key?('content')
                                             extended_metadata['content'].to_json
                                           else
                                             '{"ops":[{"insert":""}]}'
                                           end
          end

          if extended_metadata&.key?('general_description') && extended_metadata['general_description'].is_a?(Hash)
            extended_metadata['general_description'] = extended_metadata['general_description'].to_json
          end

          old_analyses_compared = nil
          if child[:is_new]
            # Create container
            container = parent_container.children.create(
              name: child[:name],
              container_type: child[:container_type],
              description: child[:description],
              extended_metadata: extended_metadata,
            )
          else
            # Update container
            next unless (container = Container.find_by(id: child[:id]))

            raw = container.extended_metadata['analyses_compared']
            old_analyses_compared = parse_analyses_compared(raw)

            container.update!(
              name: child[:name],
              container_type: child[:container_type],
              description: child[:description],
              extended_metadata: extended_metadata,
            )
          end

          create_or_update_attachments(container, child[:attachments]) if child[:attachments]

          if child[:container_type] == 'dataset' && child[:dataset].present? && child[:dataset]['changed']
            container.save_dataset(dataset: child[:dataset], element: parent_container&.root&.containable, current_user: current_user) # rubocop:disable Layout/LineLength
          end
          create_or_update_containers(child[:children], container, current_user)

          dataset_being_deleted = child[:children]&.any? { |c| c[:container_type] == 'dataset' && c[:is_deleted] }
          if dataset_being_deleted && extended_metadata&.[]('analyses_compared').present?
            extended_metadata.delete('analyses_compared')
            container.update!(extended_metadata: extended_metadata)
          end

          next unless extended_metadata&.[]('analyses_compared').present?

          current_analyses_compared = parse_analyses_compared(extended_metadata['analyses_compared'])
          next unless current_analyses_compared.is_a?(Array)
          next if current_analyses_compared == old_analyses_compared
          next if analyses_already_in_same_dataset?(container, current_analyses_compared)

          generate_comparison_dataset!(container, current_analyses_compared)
        end
      end

      def create_or_update_attachments(container, attachments)
        return if attachments.empty?

        can_update = can_update_container?(container)
        can_edit = true
        return unless can_update

        attachments.each do |att|
          if att[:is_new]
            attachment = Attachment.where(key: att[:id], attachable: nil).last
          else
            attachment = Attachment.where(id: att[:id]).last
            container_id = attachment&.container_id
            if container_id
              att_container = Container.find(container_id)
              can_edit = can_update_container?(att_container)
            end
          end
          next unless attachment

          if att[:is_deleted] && can_edit
            attachment.destroy!
            next
          end
          attachment.update!(attachable_id: container.id, attachable_type: 'Container') if container.present?
        end
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
      # rubocop:enable Metrics/BlockLength

      def delete_containers_and_attachments(container)
        Attachment.where_container(container[:id]).destroy_all
        if container[:children]&.length&.positive?
          container[:children].each do |tmp|
            delete_containers_and_attachments(tmp)
          end
        end
        Container.where(id: container[:id]).destroy_all
      end

      def can_update_container?(container)
        if (element = container.root.containable)
          ElementPolicy.new(current_user, element).update?
        else
          true
        end
      end

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
        else
          nil
        end
      end

      def analyses_already_in_same_dataset?(container, analyses_compared)
        file_ids = analyses_compared.map { |e| e.dig('file', 'id') }.compact
        return false if file_ids.empty?

        all_in_existing_dataset = true
        first_dataset_id = nil

        file_ids.each do |fid|
          att = Attachment.find_by(id: fid)
          unless att&.attachable_type == 'Container'
            all_in_existing_dataset = false
            break
          end

          parent = Container.find_by(id: att.attachable_id)
          unless parent && parent.container_type == 'dataset' && parent.parent_id == container.id
            all_in_existing_dataset = false
            break
          end

          if first_dataset_id.nil?
            first_dataset_id = parent.id
          elsif first_dataset_id != parent.id
            all_in_existing_dataset = false
            break
          end
        end

        all_in_existing_dataset
      end

      def generate_comparison_dataset!(container, analyses_compared)
        list_file = []
        list_file_names = []
        combined_image_filename = 'combined_image.png'
        created_by_user = -1

        dataset_child = container.children.create(
          name: "Comparison #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}",
          container_type: 'dataset',
        )
        target_id = dataset_child.id
        new_analyses_compared_list = []

        analyses_compared.each do |entry|
          attachment = Attachment.find_by(id: entry.dig('file', 'id'))
          next unless attachment

          created_by_user = attachment.created_by
          base = File.basename(attachment.filename, '.*')
          base_no_compared = base.sub(/_compared_[0-9:\-]+\z/, '')
          new_filename = "#{base_no_compared}_compared_#{Time.now.strftime('%Y-%m-%d-%H:%M:%S')}#{File.extname(attachment.filename)}"

          new_att = Attachment.new(
            filename: new_filename,
            created_by: created_by_user,
            created_for: created_by_user,
            attachable_type: 'Container',
            attachable_id: target_id,
          )

          original_path = attachment.abs_path
          next unless File.exist?(original_path)

          temp_file = Tempfile.new([base, File.extname(attachment.filename)])
          FileUtils.cp(original_path, temp_file.path)
          new_att.file_path = temp_file.path
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
        container.update_column(:extended_metadata, container.extended_metadata) # rubocop:disable Rails/SkipsModelValidations

        return unless list_file.any?

        _, image = Chemotion::Jcamp::CombineImg.combine(list_file, 0, list_file_names, nil)
        return unless image.present?

        old = Attachment.find_by(filename: combined_image_filename, attachable_id: target_id)
        old&.destroy!

        att = Attachment.new(
          filename: combined_image_filename,
          created_by: created_by_user,
          created_for: created_by_user,
          file_path: image.path,
          attachable_type: 'Container',
          attachable_id: target_id,
          thumb: true,
        )
        att.save!
      end
    end
  end
end
