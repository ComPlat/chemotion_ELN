# frozen_string_literal: true

module Usecases
  module Containers
    # Creates or updates a comparison dataset, regenerates spectra, and stores combined preview.
    class ComparisonCombineSpectra
      class ContainerNotFound < StandardError; end

      class << self
        def execute!(params, current_user:) # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
          extras = parse_extras(params[:extras])
          delete_attachments!(extras)

          origin_container = resolve_origin_container(params[:container_id], params[:spectra_ids])
          raise ContainerNotFound unless origin_container

          dataset_container, update_mode = resolve_or_create_dataset!(origin_container, params, current_user)
          if update_mode && params[:edited_data_spectra].present?
            regenerate_edited_spectra!(dataset_container, params[:edited_data_spectra])
          end

          store_combined_image!(dataset_container, params[:front_spectra_idx], extras, current_user)

          existing_compare_entries = indexed_compare_entries(dataset_container)
          analyses_compared = build_analyses_compared(dataset_container, existing_compare_entries)
          update_comparison_metadata!(dataset_container, analyses_compared)

          dataset_json = Entities::ContainerEntity.represent(dataset_container).as_json
          {
            status: true,
            dataset_id: dataset_container.id,
            dataset: dataset_json,
            analyses_compared: analyses_compared,
          }
        end

        private

        def parse_extras(raw)
          return nil if raw.blank?

          JSON.parse(raw)
        rescue StandardError
          {}
        end

        def delete_attachments!(extras)
          return if extras.blank? || extras['deleted_attachment_ids'].blank?

          Attachment.where(id: extras['deleted_attachment_ids']).destroy_all
        end

        def resolve_origin_container(container_id, spectra_ids)
          origin_container = Container.find_by(id: container_id)
          return origin_container if origin_container

          first_att = Attachment.find_by(id: spectra_ids&.first)
          first_att&.container
        end

        def resolve_or_create_dataset!(origin_container, params, current_user)
          dataset_container = find_dataset_child(origin_container)
          return [dataset_container, true] if dataset_container

          holder = origin_container.container_type == 'dataset' ? origin_container.parent : origin_container
          raise ContainerNotFound unless holder

          dataset_container = Container.create!(
            name: "Comparison #{Time.current.strftime('%Y-%m-%d %H:%M:%S')}",
            container_type: 'dataset',
            parent_id: holder.id,
          )

          copy_spectra_attachments!(params[:spectra_ids], dataset_container, current_user)
          [dataset_container, false]
        end

        def find_dataset_child(origin_container)
          return origin_container if origin_container.container_type == 'dataset'

          origin_container.children.find { |c| c.container_type == 'dataset' }
        end

        def copy_spectra_attachments!(spectra_ids, dataset_container, current_user)
          spectra_ids.each do |att_id|
            att = Attachment.find_by(id: att_id)
            next unless att
            next if att.attachment.blank?

            new_att = Attachment.new(
              filename: att.filename,
              created_by: current_user.id,
              created_for: current_user.id,
              attachable_type: 'Container',
              attachable_id: dataset_container.id,
            )
            temp = att.attachment.download
            new_att.file_path = temp.path
            new_att.save!
            temp.close
            temp.unlink
          end
        end

        def regenerate_edited_spectra!(dataset_container, edited_data_spectra)
          dataset_attachments = dataset_container.attachments.index_by(&:id)

          edited_data_spectra.each do |data|
            target_att = dataset_attachments[data.dig(:si, :idx)]
            next unless target_att

            spectrum_data = data.merge(fname: compare_regeneration_fname(target_att))
            mol = Tempfile.new(['mol', '.mol'])
            begin
              new_jcamp, = Chemotion::Jcamp::Create.spectrum(
                target_att.abs_path,
                mol.path,
                false,
                spectrum_data,
              )
              FileUtils.cp(new_jcamp.path, target_att.abs_path) if new_jcamp && File.exist?(new_jcamp.path)
            rescue StandardError => e
              Rails.logger.error "Failed to update spectrum #{target_att.id}: #{e.message}"
            ensure
              mol.close
              mol.unlink
            end
          end
        end

        def store_combined_image!(dataset_container, front_spectra_idx, extras, current_user)
          spectra_attachments = dataset_container.attachments.reject do |a|
            a.filename.to_s.downcase.end_with?('.png', '.jpg')
          end

          _, image = Chemotion::Jcamp::CombineImg.combine(
            spectra_attachments.map(&:abs_path),
            front_spectra_idx,
            spectra_attachments.map(&:filename),
            extras,
          )
          return if image.blank?

          dataset_container.attachments.where(filename: 'combined_image.png').destroy_all
          Attachment.create!(
            filename: 'combined_image.png',
            file_path: image.path,
            attachable_type: 'Container',
            attachable_id: dataset_container.id,
            created_by: current_user.id,
            created_for: current_user.id,
            thumb: true,
          )
        end

        def build_analyses_compared(dataset_container, existing_compare_entries)
          final_attachments = dataset_container.attachments.reload
          non_combined_images = final_attachments.reject do |a|
            a.filename.to_s.downcase.end_with?('.png')
          end
          non_combined_images.map do |a|
            build_compare_entry(a, dataset_container, existing_compare_entries)
          end
        end

        def update_comparison_metadata!(dataset_container, analyses_compared)
          # rubocop:disable Rails/SkipsModelValidations -- bulk update of JSON metadata; validations not required here
          dataset_container.update_column(
            :extended_metadata,
            (dataset_container.extended_metadata || {}).merge(
              'is_comparison' => 'true',
              'analyses_compared' => analyses_compared,
            ),
          )
          # rubocop:enable Rails/SkipsModelValidations
        end

        def normalized_compare_entry(entry)
          entry.respond_to?(:deep_stringify_keys) ? entry.deep_stringify_keys : entry
        end

        def parse_compare_entries(raw)
          parsed = if raw.is_a?(String)
                     JSON.parse(raw.gsub('=>', ':'))
                   else
                     raw
                   end
          parsed.is_a?(Array) ? parsed.map { |entry| normalized_compare_entry(entry) || {} } : []
        rescue StandardError
          []
        end

        def indexed_compare_entries(container)
          raw = container&.extended_metadata&.[]('analyses_compared') ||
                container&.extended_metadata&.[](:analyses_compared)
          parse_compare_entries(raw).index_by { |entry| entry.dig('file', 'id') }
        end

        def build_compare_entry(attachment, dataset_container, existing_entries)
          existing = normalized_compare_entry(existing_entries[attachment.id]) || {}
          existing.merge(
            'file' => (normalized_compare_entry(existing['file']) || {}).merge('id' => attachment.id),
            'dataset' => (normalized_compare_entry(existing['dataset']) || {}).merge('id' => dataset_container.id),
            'analysis' => (normalized_compare_entry(existing['analysis']) || {}).merge('id' => dataset_container.id),
          )
        end

        def compare_regeneration_fname(attachment)
          filename = attachment.filename.to_s
          ext = File.extname(filename)
          ext = '.jdx' if ext.blank?
          base = File.basename(filename, File.extname(filename))
          cleaned = base.sub(/(?:\.peak)?_compared_\d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}\z/i, '')
                        .sub(/\.peak\z/i, '')
          "#{cleaned.presence || base}#{ext}"
        end
      end
    end
  end
end
