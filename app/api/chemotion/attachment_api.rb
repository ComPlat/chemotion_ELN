# frozen_string_literal: true

require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require 'digest'

module Chemotion
  class AttachmentAPI < Grape::API # rubocop:disable Metrics/ClassLength
    helpers do
      def thumbnail(att)
        att.thumb ? Base64.encode64(att.read_thumbnail) : nil
      end

      def thumbnail_obj(att)
        { id: att.id, thumbnail: thumbnail(att) }
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
    end

    rescue_from ActiveRecord::RecordNotFound do |_error|
      message = 'Could not find attachment'
      error!(message, 404)
    end


    resource :export_ds do
      before do
        @container = Container.find_by(id: params[:container_id])
        element = @container.root.containable
        can_read = ElementPolicy.new(current_user, element).read?
        can_dwnld = can_read &&
                    ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
        error!('401 Unauthorized', 401) unless can_dwnld
      end
      desc "Download the dataset attachment file"
      get 'dataset/:container_id' do
        env['api.format'] = :binary
        export = Labimotion::ExportDataset.new
        export.export(params[:container_id])
        export.spectra(params[:container_id])
        content_type('application/vnd.ms-excel')
        ds_filename = export.res_name(params[:container_id])
        filename = URI.escape(ds_filename)
        header('Content-Disposition', "attachment; filename=\"#{filename}\"")
        export.read
      end
    end

    resource :attachments do
      before do
        @attachment = Attachment.find_by(id: params[:attachment_id])

        @attachment = Attachment.find_by(identifier: params[:identifier]) if @attachment.nil? && params[:identifier]

        case request.env['REQUEST_METHOD']
        when /delete/i
          error!('401 Unauthorized', 401) unless writable?(@attachment)
        when /get/i
          can_dwnld = false
          if /zip/.match?(request.url)
            @container = Container.find(params[:container_id])
            if (element = @container.root.containable)
              can_read = ElementPolicy.new(current_user, element).read?
              can_dwnld = can_read &&
                          ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
            end
          elsif /sample_analyses/.match?(request.url)
            @sample = Sample.find(params[:sample_id])
            if (element = @sample)
              can_read = ElementPolicy.new(current_user, element).read?
              can_dwnld = can_read &&
                          ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
            end
          elsif @attachment
            can_dwnld = @attachment.container_id.nil? && @attachment.created_for == current_user.id
            if !can_dwnld && (element = @attachment.container&.root&.containable)
              can_dwnld = (element.is_a?(User) && (element == current_user)) ||
                          (ElementPolicy.new(current_user, element).read? &&
                          ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?)
            end
          end
          error!('401 Unauthorized', 401) unless can_dwnld
        end
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

      desc 'get_annotated_image_of_attachment'
      get ':attachment_id/annotated_image' do
        content_type 'application/octet-stream'

        env['api.format'] = :binary
        store = @attachment.attachment.storage.directory
        file_location = store.join(
          @attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] || 'not available',
        )

        uploaded_file = if file_location.present? && File.file?(file_location)
                          extension_of_annotation = File.extname(@attachment.filename)
                          extension_of_annotation = '.png' if @attachment.attachment.mime_type == 'image/tiff'
                          filename_of_annotated_image = @attachment.filename.gsub(
                            File.extname(@attachment.filename),
                            "_annotated#{extension_of_annotation}",
                          )
                          header['Content-Disposition'] = "attachment; filename=\"#{filename_of_annotated_image}\""
                          File.open(file_location)
                        else
                          header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
                          @attachment.attachment_attacher.file
                        end
        data = uploaded_file.read
        uploaded_file.close

        data
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
        params.each do |_file_id, file|
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
          ensure
            tempfile.close
            tempfile.unlink
          end
        end

        true
      end

      desc 'Download the attachment file'
      get ':attachment_id' do
        content_type 'application/octet-stream'
        header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
        env['api.format'] = :binary
        uploaded_file = @attachment.attachment_attacher.file

        data = uploaded_file.read
        uploaded_file.close

        data
      end

      desc 'Download the zip attachment file'
      get 'zip/:container_id' do
        env['api.format'] = :binary
        content_type('application/zip, application/octet-stream')
        filename = CGI.escape("#{@container.parent&.name&.gsub(/\s+/, '_')}-#{@container.name.gsub(/\s+/, '_')}.zip")
        header('Content-Disposition', "attachment; filename=\"#{filename}\"")
        zip = Zip::OutputStream.write_buffer do |zip| # rubocop:disable Lint/ShadowingOuterLocalVariable
          file_text = ''
          @container.attachments.each do |att|
            zip.put_next_entry att.filename
            zip.write att.read_file
            file_text += "#{att.filename} #{att.checksum}\n"
            next unless att.annotated?

            begin
              annotated_file_name = "#{File.basename(att.filename, '.*')}_annotated#{File.extname(att.filename)}"
              zip.put_next_entry annotated_file_name
              file = File.open(att.annotated_file_location)
              zip.write file.read
              file_text += "#{annotated_file_name} #{file.size}\n"
            ensure
              file.close
            end
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
          DownloadAnalysesJob.perform_later(@sample.id, current_user.id, false)
          nil
        else
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = CGI.escape("#{@sample.short_label}-analytical-files.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = DownloadAnalysesJob.perform_now(@sample.id, current_user.id, true)
          zip.rewind
          zip.read

        end
      end

      desc 'Return image attachment'

      params do
        requires :attachment_id, type: Integer, desc: 'Database id of image attachment'
        optional :identifier, type: String, desc: 'Identifier(UUID) of image attachment as fallback loading criteria'
        optional :annotated, type: Boolean, desc: 'Return annotated image if possible'
      end

      get 'image/:attachment_id' do
        data = Usecases::Attachments::LoadImage.execute!(@attachment, params[:annotated])
        content_type @attachment.content_type
        header['Content-Disposition'] = "attachment; filename=\"#{@attachment.filename}\""
        header['Content-Transfer-Encoding'] = 'binary'
        env['api.format'] = :binary
        data
      end

      desc 'Return Base64 encoded thumbnail'
      get 'thumbnail/:attachment_id' do
        Base64.encode64(@attachment.read_thumbnail) if @attachment.thumb
      end

      desc 'Return Base64 encoded thumbnails'
      params do
        requires :ids, type: Array[Integer]
      end
      post 'thumbnails' do
        thumbnails = params[:ids].map do |a_id|
          att = Attachment.find(a_id)
          can_dwnld = if att
                        element = att.container.root.containable
                        can_read = ElementPolicy.new(current_user, element).read?
                        can_read && ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
                      end
          can_dwnld ? thumbnail_obj(att) : nil
        end
        { thumbnails: thumbnails }
      end

      desc 'Return Base64 encoded files'
      params do
        requires :ids, type: Array[Integer]
      end
      post 'files' do
        files = params[:ids].map do |a_id|
          att = Attachment.find(a_id)
          can_dwnld = if att
                        element = att.container.root.containable
                        can_read = ElementPolicy.new(current_user, element).read?
                        can_read && ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
                      end
          can_dwnld ? raw_file_obj(att) : nil
        end
        { files: files }
      end

      desc 'Regenerate spectra'
      params do
        requires :original, type: Array[Integer]
        requires :generated, type: Array[Integer]
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

          att.set_regenerating
          att.save
        end

        {} # FE does not use the result
      end

      desc 'Regenerate edited spectra'
      params do
        requires :edited, type: Array[Integer]
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
          att.file_data = result
          att.rewrite_file_data!
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
      end
      post 'save_spectrum' do
        jcamp_att = @attachment.generate_spectrum(
          false, false, params
        )
        { files: [raw_file_obj(jcamp_att)] }
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
