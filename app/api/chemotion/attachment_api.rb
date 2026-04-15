# frozen_string_literal: true

require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require 'digest'

module Chemotion
  class AttachmentAPI < Grape::API # rubocop:disable Metrics/ClassLength
    helpers do
      def thumbnail_obj(att)
        { id: att.id, thumbnail: att.thumbnail_base64 }
      end

      def raw_file(att)
        Base64.encode64(att.read_file)
      rescue StandardError
        nil
      end

      def raw_file_obj(att)
        {
          id: att.id,
          file: raw_file(att),
          predictions: JSON.parse(att.get_infer_json_content),
        }
      end

      def writable?(attachment)
        AttachmentPolicy.can_delete?(current_user, attachment)
      end

      def upload_chunk_error_message
        { ok: false, statusText: 'File key is not valid' }
      end

      def remove_duplicated(att)
        old_att = Attachment.find_by(filename: att.filename, attachable_id: att.attachable_id)
        return unless old_att.id != att.id

        old_att&.destroy
      end

      def remove_generated_children(att)
        Attachment.children_of(att.id).find_each do |child|
          next unless writable?(child)

          child.destroy
        end
      end

      def lcms_tmp_name(tmp_file)
        return '' unless tmp_file

        if tmp_file.respond_to?(:original_filename)
          tmp_file.original_filename.to_s
        elsif tmp_file.respond_to?(:path)
          File.basename(tmp_file.path.to_s)
        else
          tmp_file.to_s
        end
      end

      def lcms_tmp_preview(tmp_file, bytes = 2048)
        return '' unless tmp_file

        if tmp_file.respond_to?(:path) && tmp_file.path.present? && File.exist?(tmp_file.path)
          File.binread(tmp_file.path, bytes)
        elsif tmp_file.respond_to?(:read)
          tmp_file.rewind if tmp_file.respond_to?(:rewind)
          data = tmp_file.read(bytes)
          tmp_file.rewind if tmp_file.respond_to?(:rewind)
          data.to_s
        else
          ''
        end
      rescue StandardError
        ''
      end

      def lcms_tmp_page_value(tmp_file)
        preview = lcms_tmp_preview(tmp_file)
        match = preview.match(/##PAGE\s*=\s*"?([0-9.+\-Ee]+)"?/)
        return nil unless match

        Float(match[1])
      rescue ArgumentError, TypeError
        nil
      end

      def lcms_preview_value(preview, label)
        match = preview.match(/^###{Regexp.escape(label)}\s*=\s*(.+)$/i)
        return nil unless match

        match[1].to_s.strip.delete_prefix('"').delete_suffix('"').presence
      end

      def lcms_tmp_polarity(tmp_file)
        name = lcms_tmp_name(tmp_file).downcase
        return 'positive' if name.match?(/(?:^|[._-])(plus|positive|pos)(?:[._-]|$)/)
        return 'negative' if name.match?(/(?:^|[._-])(minus|negative|neg)(?:[._-]|$)/)

        preview = lcms_tmp_preview(tmp_file)
        return 'positive' if preview.match?(/##POLARITY\s*=\s*"?positive"?/i)
        return 'negative' if preview.match?(/##POLARITY\s*=\s*"?negative"?/i)

        nil
      end

      def lcms_page_distance(page_value, requested_retention_time)
        requested_rt = Float(requested_retention_time) rescue nil
        return Float::INFINITY unless page_value && requested_rt

        (page_value - requested_rt).abs
      end

      def lcms_preview_kind(name, preview)
        label = name.to_s.downcase
        return 'uvvis' if label.match?(/(?:^|[._-])uvvis(?:[._-]|$)/)
        return 'tic' if label.match?(/(?:^|[._-])tic(?:[._-]|$)/)
        return 'mz' if label.match?(/(?:^|[._-])(mz|ms)(?:[._-]|$)/)

        data_type = lcms_preview_value(preview, 'DATA TYPE').to_s.upcase
        x_units = lcms_preview_value(preview, 'XUNITS').to_s.upcase
        y_units = lcms_preview_value(preview, 'YUNITS').to_s.upcase
        title = lcms_preview_value(preview, 'TITLE').to_s.upcase

        return 'mz' if data_type.include?('MASS SPECTRUM') || x_units.include?('M/Z')
        return 'uvvis' if title.include?('UVVIS') || y_units.include?('DETECTOR SIGNAL')
        return 'tic' if x_units.include?('RETENTION TIME')

        'unknown'
      end

      def lcms_tmp_info(tmp_file)
        preview = lcms_tmp_preview(tmp_file, 4096)
        kind = lcms_preview_kind(lcms_tmp_name(tmp_file), preview)
        x_units = lcms_preview_value(preview, 'XUNITS')
        y_units = lcms_preview_value(preview, 'YUNITS')
        data_type = lcms_preview_value(preview, 'DATA TYPE')
        {
          name: lcms_tmp_name(tmp_file),
          page: lcms_tmp_page_value(tmp_file),
          polarity: lcms_tmp_polarity(tmp_file),
          kind: kind,
          x_units: x_units,
          y_units: y_units,
          data_type: data_type,
          has_page_header: preview.include?('##PAGE='),
          is_ms_page: kind == 'mz' && x_units.to_s.match?(/m\/z/i) && lcms_tmp_page_value(tmp_file).present?
        }
      end

      def lcms_attachment_preview(att, bytes = 4096)
        return '' unless att&.respond_to?(:abs_path)

        path = att.abs_path.to_s
        return '' if path.blank? || !File.exist?(path)

        File.binread(path, bytes)
      rescue StandardError
        ''
      end

      def lcms_attachment_info(att)
        preview = lcms_attachment_preview(att, 4096)
        kind = lcms_preview_kind(att&.filename, preview)
        x_units = lcms_preview_value(preview, 'XUNITS')
        {
          name: att&.filename.to_s,
          page: begin
            match = preview.match(/##PAGE\s*=\s*"?([0-9.+\-Ee]+)"?/)
            match ? Float(match[1]) : nil
          rescue ArgumentError, TypeError
            nil
          end,
          kind: kind,
          x_units: x_units,
          y_units: lcms_preview_value(preview, 'YUNITS'),
          data_type: lcms_preview_value(preview, 'DATA TYPE'),
          has_page_header: preview.include?('##PAGE='),
          is_ms_page: kind == 'mz' && x_units.to_s.match?(/m\/z/i) && preview.include?('##PAGE=')
        }
      end

      def lcms_attachment_polarity(att)
        name = att&.filename.to_s.downcase
        return 'positive' if name.match?(/(?:^|[._-])(plus|positive|pos)(?:[._-]|$)/)
        return 'negative' if name.match?(/(?:^|[._-])(minus|negative|neg)(?:[._-]|$)/)

        preview = lcms_attachment_preview(att, 4096)
        scan_mode = lcms_preview_value(preview, 'SCAN_MODE').to_s.downcase
        return 'positive' if scan_mode.include?('posit')
        return 'negative' if scan_mode.include?('negat')

        nil
      end

      def lcms_sibling_attachments(att)
        scope = Attachment.where(attachable_id: att.attachable_id)
        scope = scope.where(attachable_type: att.attachable_type) if att.respond_to?(:attachable_type) && att.attachable_type.present?
        scope.where.not(id: att.id)
      end

      def lcms_mz_attachments(att)
        lcms_sibling_attachments(att).select do |candidate|
          name = candidate.filename.to_s.downcase
          name.match?(/\.(jdx|dx|jcamp)\z/) && name.match?(/(?:^|[._-])(mz|ms)(?:[._-]|$)/)
        end
      end

      def lcms_page_blocks(raw)
        return [] if raw.blank?

        raw.scan(/(^##PAGE=.*?)(?=^##PAGE=|\z)/m)
          .flatten
          .map(&:to_s)
          .reject(&:blank?)
      end

      def lcms_page_header_value(block)
        match = block.to_s.match(/^##PAGE.*?([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/)
        return nil unless match

        Float(match[1])
      rescue ArgumentError, TypeError
        nil
      end

      def lcms_header_prefix(raw)
        idx = raw.to_s.index(/^##PAGE=/)
        idx ? raw[0...idx] : raw.to_s
      end

      def lcms_build_single_page_jcamp(source_raw, page_block, page_value)
        prefix = lcms_header_prefix(source_raw)
        normalized_prefix = prefix.to_s.lines.map(&:rstrip).reject { |line| line == '##END=' }
        normalized_block = page_block.to_s.lines.map(&:rstrip).reject { |line| line == '##END=' }
        normalized_block[0] = "##PAGE=#{page_value}" if normalized_block[0].to_s.start_with?('##PAGE=')
        "#{(normalized_prefix + normalized_block + ['##END=']).join("\n")}\n"
      end

      def lcms_extract_existing_mz_page(att, requested_retention_time, requested_polarity)
        requested_rt = Float(requested_retention_time) rescue nil
        polarity = requested_polarity.to_s.downcase.presence
        attachments = lcms_mz_attachments(att)
        return nil if attachments.empty?

        filtered_attachments = if polarity.present?
          exact = attachments.select { |candidate| lcms_attachment_polarity(candidate) == polarity }
          exact.presence || attachments
        else
          attachments
        end

        candidates = filtered_attachments.flat_map do |candidate|
          raw = candidate.read_file
          lcms_page_blocks(raw).map do |block|
            page_value = lcms_page_header_value(block)
            next unless page_value

            {
              attachment: candidate,
              page_value: page_value,
              distance: lcms_page_distance(page_value, requested_rt),
              polarity: lcms_attachment_polarity(candidate),
              jcamp: lcms_build_single_page_jcamp(raw, block, page_value),
            }
          end.compact
        end

        return nil if candidates.empty?

        candidates.min_by do |candidate|
          [
            candidate[:distance],
            candidate[:attachment].id,
          ]
        end
      rescue StandardError => e
        Rails.logger.error("[lcms_page] existing mz extraction failed attachment_id=#{att&.id}: #{e.message}")
        nil
      end

      def pick_lcms_ms_tmp_jcamp(tmp_files, requested_retention_time = nil, requested_polarity = nil)
        files = Array(tmp_files).compact
        return nil if files.empty?

        normalized_polarity = requested_polarity.to_s.downcase.presence
        candidates = files.map { |tmp| [tmp, lcms_tmp_info(tmp)] }
        candidates = candidates.select { |_tmp, info| info[:is_ms_page] }
        return nil if candidates.empty?

        if normalized_polarity.present?
          exact_polarity = candidates.select { |_tmp, info| info[:polarity] == normalized_polarity }
          candidates = exact_polarity if exact_polarity.present?
        end

        ranked = candidates.sort_by do |_tmp, info|
          [
            lcms_page_distance(info[:page], requested_retention_time),
            info[:page].nil? ? 1 : 0,
            info[:name].to_s
          ]
        end

        ranked.first&.first
      end
    end

    rescue_from ActiveRecord::RecordNotFound do |_error|
      message = 'Could not find attachment'
      error!(message, 404)
    end

    resource :export_ds do
      before do
        @container = Container.find_by(id: params[:container_id])
        element = @container.root.containable
        policy = ElementPolicy.new(current_user, element)
        can_read = policy.read?
        can_dwnld = can_read && policy.read_dataset?
        error!('401 Unauthorized', 401) unless can_dwnld
      end
      desc 'Download the dataset attachment file'
      get 'dataset/:container_id' do
        env['api.format'] = :binary
        export = Labimotion::ExportDataset.new(params[:container_id])
        export.export
        content_type('application/vnd.ms-excel')
        ds_filename = export.res_name
        filename = URI.escape(ds_filename)
        header('Content-Disposition', "attachment; filename=\"#{filename}\"")
        export.read
      end
    end

    resource :attachments do
      before do
        next if request.path.end_with?('bulk_delete') && request.request_method == 'DELETE'

        @attachment = Attachment.find_by(id: params[:attachment_id])

        @attachment = Attachment.find_by(identifier: params[:identifier]) if @attachment.nil? && params[:identifier]

        # rubocop:disable Performance/StringInclude, Metrics/BlockNesting
        case request.env['REQUEST_METHOD']
        when /delete/i
          error!('401 Unauthorized', 401) unless writable?(@attachment)
        when /get/i
          can_dwnld = false
          if /zip/.match?(request.url)
            @container = Container.find(params[:container_id])
            if (element = @container.root.containable)
              policy = ElementPolicy.new(current_user, element)
              can_read = policy.read?
              can_dwnld = can_read &&
                          policy.read_dataset?
            end
          elsif /\bsample_analyses\b/.match?(request.url)
            @sample = Sample.find(params[:sample_id])
            if (element = @sample)
              policy = ElementPolicy.new(current_user, element)
              can_read = policy.read?
              can_dwnld = can_read && policy.read_dataset?
            end
          elsif /device_description_analyses/.match?(request.url)
            @device_description = DeviceDescription.find(params[:device_description_id])
            if (element = @device_description)
              policy = ElementPolicy.new(current_user, element)
              can_read = policy.read?
              can_dwnld = can_read && policy.read_dataset?
            end
          elsif /\bsequence_based_macromolecule_sample_analyses\b/.match?(request.url)
            @sequence_based_macromolecule_sample =
              SequenceBasedMacromoleculeSample.find(params[:sequence_based_macromolecule_sample_id])
            if (element = @sequence_based_macromolecule_sample)
              can_read = ElementPolicy.new(current_user, element).read?
              can_dwnld = can_read &&
                          ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
            end
          elsif @attachment
            can_dwnld = @attachment.container_id.nil? && @attachment.created_for == current_user.id

            if !can_dwnld && (element = @attachment.container&.root&.containable || @attachment.attachable)
              can_dwnld = if element.is_a?(Container)
                            false
                          else
                            # I have no idea on how to fix this code? a User is not an element so it
                            # makes no sense to even try using ElementPolicy.
                            # So I just replaced ElementPermissionProxy with ElementPolicy, so it won't crash
                            policy = ElementPolicy.new(current_user, element)
                            (element.is_a?(User) && (element == current_user)) ||
                              (
                                policy.read? &&
                                policy.read_dataset?
                              )
                          end
            end
          end
          error!('401 Unauthorized', 401) unless can_dwnld
        end
        # rubocop:enable Performance/StringInclude, Metrics/BlockNesting
      end

      desc 'Bulk Delete Attachments'
      delete 'bulk_delete' do
        ids = params[:ids]
        attachments = Attachment.where(id: ids)

        unpermitted_attachments = attachments.reject { |attachment| writable?(attachment) }

        if unpermitted_attachments.any?
          error!('401 Unauthorized', 401)
        else
          deleted_attachments = attachments.destroy_all
        end

        { deleted_attachments: deleted_attachments }
      rescue StandardError => e
        Rails.logger.error("Error deleting attachments: #{e.message}")
        error!({ error: e.message }, 422)
      end

      desc 'Delete Attachment'
      delete ':attachment_id' do
        present Usecases::Attachments::Delete.execute!(@attachment),
                with: Entities::AttachmentEntity,
                root: :attachment
      end

      desc 'Delete container id of attachment'
      delete 'link/:attachment_id' do
        present Usecases::Attachments::Unlink.execute!(@attachment),
                with: Entities::AttachmentEntity,
                root: :attachment
      end

      # TODO: Remove this endpoint. It is not used by the FE
      desc 'Upload attachments'
      post 'upload_dataset_attachments' do
        error_messages = []
        params.each do |_file_id, file|
          next unless tempfile = file[:tempfile] # rubocop:disable Lint/AssignmentInCondition

          a = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: file[:name],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type],
            file_path: file[:tempfile].path,
          )

          begin
            a.save!
          rescue StandardError
            error_messages.push(a.errors.to_h[:attachment]) # rubocop:disable Rails/DeprecatedActiveModelErrorsMethods
          ensure
            tempfile.close
            tempfile.unlink
          end
        end
        true
      end

      desc 'Upload large file as chunks'
      params do
        requires :file, type: File, desc: 'file'
        requires :counter, type: Integer, default: 0
        requires :key, type: String
      end
      post 'upload_chunk' do
        return upload_chunk_error_message unless AttachmentPolicy.can_upload_chunk?(params[:key])

        Usecases::Attachments::UploadChunk.execute!(params)
      end

      desc 'Upload completed'
      params do
        requires :filename, type: String
        requires :key, type: String
        requires :checksum, type: String
      end
      post 'upload_chunk_complete' do
        return upload_chunk_error_message unless AttachmentPolicy.can_upload_chunk?(params[:key])

        usecase = Usecases::Attachments::UploadChunkComplete.execute!(current_user, params)
        return usecase if usecase.present?

        { ok: false, statusText: ['File upload has error. Please try again!'] }
      end

      desc 'get_annotation_of_attachment'
      get ':attachment_id/annotation' do
        loader = Usecases::Attachments::Annotation::AnnotationLoader.new
        return loader.get_annotation_of_attachment(params[:attachment_id])
      end

      desc 'update_annotation_of_attachment'
      post ':attachment_id/annotation' do
        params do
          require :updated_svg_string, type: String
        end
        updater = Usecases::Attachments::Annotation::AnnotationUpdater.new
        updater.update_annotation(
          params['updated_svg_string'],
          params['attachment_id'].to_i,
        )
      end

      desc 'Upload files to Inbox as unsorted'
      post 'upload_to_inbox' do
        attach_ary = []
        params.each_value do |file|
          next unless tempfile = file[:tempfile] # rubocop:disable Lint/AssignmentInCondition

          attach = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: file[:name],
            file_path: file[:tempfile],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type],
            attachable_type: 'Container',
          )
          begin
            attach.save!
            attach_ary.push(attach.id)
            match, variation = attach.resolve_unique_match

            if match # auto assign to element
              analysis_name = attach.filename.chomp(File.extname(attach.filename))
              dataset = match.container.analyses_container.create_analysis_with_dataset!(name: analysis_name)
              attach.update!(attachable: dataset)
              type = match.model_name.singular
              @link = "#{Rails.application.config.root_url}/mydb/collection/all/#{type}/#{match.id}"
              match.assign_attachment_to_variation(variation, dataset.parent_id) if match.is_a?(Reaction)

              Message.create_msg_notification(
                channel_subject: Channel::ASSIGN_INBOX_TO_SAMPLE,
                message_from: current_user.id,
                data_args: { filename: attach.filename, info: "#{match.short_label} #{match.name}" },
                url: @link,
                level: 'success',
              )
            end
          rescue StandardError => e
            Rails.logger.error(e)
            status 413
          ensure
            tempfile.close
            tempfile.unlink
          end
        end

        true
      end

      desc 'Download the attachment file'
      params do
        optional :annotated, type: Boolean, desc: 'Return annotated image if possible'
      end
      get ':attachment_id' do
        content_type @attachment.content_type || 'application/octet-stream'
        header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
        env['api.format'] = :binary
        file = @attachment.attachment
        if params[:annotated] && @attachment.annotated?
          annotation = @attachment.annotated_file_location.presence
          header['Content-Disposition'] = "attachment; filename=\"#{@attachment.annotated_filename}\""
          file = File.open(annotation)
        end

        body file.read
      ensure
        file&.close
      end

      desc 'Download the zip attachment file'
      get 'zip/:container_id' do
        env['api.format'] = :binary
        content_type('application/zip, application/octet-stream')
        filename = CGI.escape("#{@container.parent&.name&.gsub(/\s+/, '_')}-#{@container.name.gsub(/\s+/, '_')}.zip")
        header('Content-Disposition', "attachment; filename=\"#{filename}\"")
        zip = Zip::OutputStream.write_buffer do |zip|
          file_text = ''
          @container.attachments.each do |att|
            zip.put_next_entry att.filename
            zip.write att.read_file
            file_text += "#{att.filename} #{att.checksum}\n"
            next unless att.annotated?

            begin
              zip.put_next_entry att.annotated_filename
              file = File.open(att.annotated_file_location)
              zip.write file.read
              file_text += "#{att.annotated_filename} #{file.size}\n"
            ensure
              file&.close
            end
          end

          if Labimotion::Dataset.find_by(element_id: params[:container_id], element_type: 'Container').present?
            export = Labimotion::ExportDataset.new(params[:container_id])
            export.export
            zip.put_next_entry export.res_name
            zip.write export.read
          end

          hyperlinks_text = ''
          JSON.parse(@container.extended_metadata.fetch('hyperlinks', '[]')).each do |link|
            hyperlinks_text += "#{link} \n"
          end
          zip.put_next_entry 'dataset_description.txt'
          zip.write <<~DESC
            dataset name: #{@container.name}
            instrument: #{@container.extended_metadata.fetch('instrument', nil)}
            description:
            #{@container.description}
             Files:
            #{file_text}
            Hyperlinks:
            #{hyperlinks_text}
          DESC
        end
        zip.rewind
        zip.read
      end

      desc 'Download the zip attachment file by sample_id'
      get 'sample_analyses/:sample_id' do
        tts = @sample.analyses&.map do |a|
                a.children&.map do |d|
                  d.attachments&.map(&:filesize)
                end
              end&.flatten&.reduce(:+) || 0
        if tts > 300_000_000
          DownloadAnalysesJob.perform_later(@sample.id, current_user.id, false, 'sample')
          nil
        else
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = CGI.escape("#{@sample.short_label}-analytical-files.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = DownloadAnalysesJob.perform_now(@sample.id, current_user.id, true, 'sample')
          zip.rewind
          zip.read

        end
      end

      desc 'Download the zip attachment file by device_description_id'
      get 'device_description_analyses/:device_description_id' do
        tts = @device_description.analyses&.map do |a|
                a.children&.map do |d|
                  d.attachments&.map(&:filesize)
                end
              end&.flatten&.sum || 0
        if tts > 300_000_000
          DownloadAnalysesJob.perform_later(@device_description.id, current_user.id, false, 'device_description')
          nil
        else
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = CGI.escape("#{@device_description.short_label}-analytical-files.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = DownloadAnalysesJob.perform_now(@device_description.id, current_user.id, true, 'device_description')
          zip.rewind
          zip.read
        end
      end

      desc 'Download the zip attachment file by sequence_based_macromolecule_sample_id'
      get 'sequence_based_macromolecule_sample_analyses/:sequence_based_macromolecule_sample_id' do
        tts = @sequence_based_macromolecule_sample.analyses&.map do |a|
                a.children&.map do |d|
                  d.attachments&.map(&:filesize)
                end
              end&.flatten&.sum || 0
        if tts > 300_000_000
          DownloadAnalysesJob.perform_later(
            @sequence_based_macromolecule_sample.id, current_user.id, false, 'sequence_based_macromolecule_sample'
          )
          nil
        else
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = CGI.escape("#{@sequence_based_macromolecule_sample.short_label}-analytical-files.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = DownloadAnalysesJob.perform_now(
            @sequence_based_macromolecule_sample.id, current_user.id, true, 'sequence_based_macromolecule_sample'
          )
          zip.rewind
          zip.read
        end
      end

      desc 'Return image attachment'

      params do
        requires :attachment_id, type: Integer, desc: 'Database id of image attachment'
        optional :identifier, type: String, desc: 'Identifier(UUID) of image attachment as fallback loading criteria'
      end

      get 'image/:attachment_id' do
        annotated = @attachment.attachment_attacher.derivatives.key?(:annotation)
        data = Usecases::Attachments::LoadImage.execute!(@attachment, annotated)
        content_type @attachment.content_type
        header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
        header['Content-Transfer-Encoding'] = 'binary'
        env['api.format'] = :binary
        data
      end

      desc 'Return Base64 encoded thumbnail'
      get 'thumbnail/:attachment_id' do
        @attachment.thumbnail_base64
      end

      desc 'Return Base64 encoded thumbnails'
      params do
        requires :ids, type: [Integer]
      end
      post 'thumbnails' do
        thumbnails = params[:ids].map do |a_id|
          att = Attachment.find(a_id)
          can_dwnld = if att
                        element = att.container.root.containable
                        policy = ElementPolicy.new(current_user, element)
                        can_read = policy.read?
                        can_read && policy.read_dataset?
                      end
          can_dwnld ? thumbnail_obj(att) : nil
        end
        { thumbnails: thumbnails }
      end

      desc 'Return Base64 encoded files'
      params do
        requires :ids, type: [Integer]
      end
      post 'files' do
        files = params[:ids].map do |a_id|
          att = Attachment.find(a_id)
          can_dwnld = if att
                        element = att.container.root.containable
                        policy = ElementPolicy.new(current_user, element)
                        can_read = policy.read?
                        can_read && policy.read_dataset?
                      end
          can_dwnld ? raw_file_obj(att) : nil
        end
        error!('401 Unauthorized', 401) if !files.empty? && files.compact.empty?
        { files: files }
      end

      desc 'Regenerate spectra'
      params do
        requires :original, type: [Integer]
        requires :generated, type: [Integer]
      end
      post 'regenerate_spectrum' do
        pm = to_rails_snake_case(params)
        Attachment.where(id: pm[:generated]).each do |att|
          next unless writable?(att)

          att.destroy
        end
        Attachment.where(id: pm[:original]).each do |att|
          next unless writable?(att)

          remove_duplicated(att)
          remove_generated_children(att)

          att.set_regenerating
          att.save
        end

        {} # FE does not use the result
      end

      desc 'Regenerate edited spectra'
      params do
        requires :edited, type: [Integer]
        optional :molfile, type: String
      end
      post 'regenerate_edited_spectrum' do
        pm = to_rails_snake_case(params)

        molfile = pm[:molfile]
        t_molfile = Tempfile.create('molfile')
        t_molfile.write(molfile)
        t_molfile.rewind

        Attachment.where(id: pm[:edited]).each do |att|
          next unless writable?(att)

          remove_duplicated(att)

          # TODO: do not use abs_path
          result = Chemotion::Jcamp::RegenerateJcamp.spectrum(
            att.abs_path, t_molfile.path
          )
          io = StringIO.new(result)
          io.rewind

          att.attachment_attacher.attach(
            io,
            metadata: {
              'filename' => att.filename,
              'mime_type' => att.content_type || 'chemical/x-jcamp-dx',
            },
          )

          att.save!
        end
        t_molfile.close
        t_molfile.unlink

        { status: true }
      end

      desc 'Save spectra to file'
      params do
        requires :attachment_id, type: Integer
        optional :peaks_str, type: String
        optional :shift_select_x, type: String
        optional :shift_ref_name, type: String
        optional :shift_ref_value, type: String
        optional :shift_ref_value, type: String
        optional :integration, type: String
        optional :multiplicity, type: String
        optional :mass, type: String
        optional :scan, type: String
        optional :thres, type: String
        optional :predict, type: String
        optional :keep_pred, type: Boolean
        optional :waveLength, type: String
        optional :cyclicvolta, type: String
        optional :curveIdx, type: Integer
        optional :simulatenmr, type: Boolean
        optional :axesUnits, type: String
        optional :detector, type: String
        optional :dscMetaData, type: String
        optional :lcms_uvvis_wavelength, type: String
        optional :lcms_mz_page, type: String
        optional :lcms_mz_page_data
        optional :lcms_peaks_str, type: String
        optional :lcms_integrals_str, type: String
      end
      post 'save_spectrum' do
        lcms_data = params[:lcms_mz_page_data]
        if lcms_data.respond_to?(:read)
          params[:lcms_mz_page_data] = lcms_data.read
        elsif lcms_data.is_a?(Hash) && lcms_data[:tempfile]
          params[:lcms_mz_page_data] = lcms_data[:tempfile].read
        end

        jcamp_att = @attachment.generate_spectrum(
          false, false, params
        )
        unless jcamp_att.is_a?(Attachment)
          Rails.logger.error("save_spectrum failed for attachment #{@attachment&.id}: #{jcamp_att.inspect}")
          error!({ error: 'Spectrum generation failed' }, 422)
        end
        { files: [raw_file_obj(jcamp_att)] }
      end

      desc 'Fetch LCMS page on demand'
      params do
        requires :attachment_id, type: Integer
        requires :retention_time, type: String
        optional :polarity, type: String
        optional :trigger, type: String
      end
      post 'lcms_page' do
        lcms_params = params.to_h.symbolize_keys
        lcms_params[:lcms_mz_page] = lcms_params[:retention_time]
        lcms_params[:lcms_polarity] = lcms_params[:polarity] if lcms_params[:polarity].present?
        lcms_params[:lcms_trigger] = lcms_params[:trigger] if lcms_params[:trigger].present?
        Rails.logger.info(
          "[lcms_page] request attachment_id=#{@attachment&.id} filename=#{@attachment&.filename} " \
          "retention_time=#{lcms_params[:retention_time]} polarity=#{lcms_params[:polarity]} " \
          "trigger=#{lcms_params[:trigger]}"
        )
        existing_mz_candidate = lcms_extract_existing_mz_page(
          @attachment,
          lcms_params[:retention_time],
          lcms_params[:polarity]
        )
        if existing_mz_candidate
          predictions = JSON.parse(@attachment.get_infer_json_content)
          Rails.logger.info(
            "[lcms_page] returning existing_mz_page attachment_id=#{@attachment&.id} " \
            "source_attachment_id=#{existing_mz_candidate[:attachment].id} " \
            "source_filename=#{existing_mz_candidate[:attachment].filename} " \
            "selected_page=#{existing_mz_candidate[:page_value]} " \
            "selected_distance=#{existing_mz_candidate[:distance]} " \
            "selected_polarity=#{existing_mz_candidate[:polarity]}"
          )
          return {
            file: {
              id: existing_mz_candidate[:attachment].id,
              file: Base64.encode64(existing_mz_candidate[:jcamp]),
              predictions: predictions,
              source: 'existing_mz_attachment',
              polarity: existing_mz_candidate[:polarity],
              page_value: existing_mz_candidate[:page_value],
            }
          }
        end
        Rails.logger.error(
          "[lcms_page] no existing mz page candidate attachment_id=#{@attachment&.id} " \
          "filename=#{@attachment&.filename} requested_rt=#{lcms_params[:retention_time]} " \
          "requested_polarity=#{lcms_params[:polarity]} mz_attachments=#{lcms_mz_attachments(@attachment).map(&:filename).inspect}"
        )
        error!({ error: 'No LCMS MS page found in existing mz jdx attachments' }, 422)
      rescue StandardError => e
        Rails.logger.error("lcms_page exception for attachment #{@attachment&.id}: #{e.message}")
        error!({ error: 'LCMS page generation failed' }, 422)
      end

      desc 'Make spectra inference'
      params do
        requires :attachment_id, type: Integer
        optional :peaks_str, type: String
        optional :shift_select_x, type: String
        optional :shift_ref_name, type: String
        optional :shift_ref_value, type: String
        optional :integration, type: String
        optional :multiplicity, type: String
        optional :mass, type: String
        optional :scan, type: String
        optional :thres, type: String
        optional :predict, type: String
        optional :keep_pred, type: Boolean
        optional :peaks, type: String
        optional :shift, type: String
        optional :layout, type: String
      end
      post 'infer' do
        predict = @attachment.infer_spectrum(params)
        params[:predict] = predict.to_json
        jcamp_att = @attachment.generate_spectrum(
          false, false, params
        )
        unless jcamp_att.is_a?(Attachment)
          Rails.logger.error("infer_spectrum failed for attachment #{@attachment&.id}: #{jcamp_att.inspect}")
          error!({ error: 'Spectrum generation failed' }, 422)
        end
        { files: [raw_file_obj(jcamp_att)], predict: predict }
      end

      namespace :svgs do
        desc 'Get QR Code SVG for element'
        params do
          requires :element_id, type: Integer
          requires :element_type, type: String
        end
        get do
          code = CodeLog.where(source: params[:element_type],
                               source_id: params[:element_id]).first
          if code
            qr_code = Barby::QrCode.new(code.value, size: 1, level: :l)
            outputter = Barby::SvgOutputter.new(qr_code)
            outputter.to_svg(margin: 0)
          else
            ''
          end
        end
      end
    end
  end
end
