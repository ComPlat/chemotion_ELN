# frozen_string_literal: true

require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require 'digest'

module Chemotion
  class AttachmentAPI < Grape::API
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
          predictions: JSON.parse(att.get_infer_json_content)
        }
      end

      def writable?(attachment)
        AttachmentPolicy.can_delete?(current_user, attachment)
      end

      def upload_chunk_error_message
        { ok: false, statusText: 'File key is not valid' }
      end
    end

    rescue_from ActiveRecord::RecordNotFound do |_error|
      message = 'Could not find attachment'
      error!(message, 404)
    end

    resource :inbox do
      params do
        requires :cnt_only, type: Boolean, desc: 'return count number only'
      end
      get do
        current_user.container = Container.create(name: 'inbox', container_type: 'root') unless current_user.container

        if params[:cnt_only]
          present current_user.container, with: Entities::InboxEntity, root: :inbox, only: [:inbox_count]
        else
          present current_user.container, with: Entities::InboxEntity, root: :inbox
        end
      end
    end

    resource :attachable do
      params do
        optional :files, type: Array[File], desc: 'files', default: []
        optional :attachable_type, type: String, desc: 'attachable_type'
        optional :attachable_id, type: Integer, desc: 'attachable id'
        optional :del_files, type: Array[Integer], desc: 'del file id', default: []
      end
      after_validation do
        case params[:attachable_type]
        when 'ResearchPlan'
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find_by(id: params[:attachable_id])).update?
        end
      end

      desc 'Update attachable records'
      post 'update_attachments_attachable' do
        attachable_type = params[:attachable_type]
        attachable_id = params[:attachable_id]
        if params.fetch(:files, []).any?
          attach_ary = []
          rp_attach_ary = []
          params[:files].each do |file|
            next unless (tempfile = file[:tempfile])

            a = Attachment.new(
              bucket: file[:container_id],
              filename: file[:filename],
              file_path: file[:tempfile],
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: file[:type],
              attachable_type: attachable_type,
              attachable_id: attachable_id
            )
            
            begin
              a.attachment_attacher.attach(File.open(file[:tempfile], binmode: true))
              if a.valid?
                a.attachment_attacher.create_derivatives
                a.save!
                attach_ary.push(a.id)
                rp_attach_ary.push(a.id) if a.attachable_type.in?(%w[ResearchPlan Wellplate Element])
              end
            ensure
              tempfile.close
              tempfile.unlink
            end
          end

          TransferThumbnailToPublicJob.set(queue: "transfer_thumbnail_to_public_#{current_user.id}").perform_later(rp_attach_ary) if rp_attach_ary.any?
          TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{current_user.id}").perform_later(attach_ary) if attach_ary.any?
        end
        Attachment.where('id IN (?) AND attachable_type = (?)', params[:del_files].map!(&:to_i), attachable_type).update_all(attachable_id: nil) if params[:del_files].any?
        true
      end
    end

    resource :attachments do
      before do
        if params[:attachment_id].present? && params[:attachment_id].match(/^(\d)+$/)
          @attachment = Attachment.find_by(id: params[:attachment_id])
        end

        @attachment = Attachment.find_by(identifier: params[:attachment_id]) if @attachment.nil?
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
              can_dwnld = element.is_a?(User) && (element == current_user) ||
                          ElementPolicy.new(current_user, element).read? &&
                          ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
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
          next unless tempfile = file[:tempfile]

          a = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: file[:name],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type]
          )

          a.attachment_attacher.attach(file[:tempfile])
          begin
            if a.valid?
              a.attachment_attacher.create_derivatives
              a.save!
            else
              error_messages.push(a.errors.to_h[:attachment])
            end
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

      desc 'Upload files to Inbox as unsorted'
      post 'upload_to_inbox' do
        attach_ary = Array.new
        params.each do |file_id, file|
          if tempfile = file[:tempfile]
              attach = Attachment.new(
                bucket: file[:container_id],
                filename: file[:filename],
                key: file[:name],
                file_path: file[:tempfile],
                created_by: current_user.id,
                created_for: current_user.id,
                content_type: file[:type],
                attachable_type: 'Container'
              )
            ActiveRecord::Base.transaction do
              begin
                attach.save!

                attach.attachment_attacher.attach(File.open(file[:tempfile].path, binmode: true))
                if attach.valid?
                  attach.attachment_attacher.create_derivatives
                  attach.save!
                  attach_ary.push(attach.id)
                else
                  raise ActiveRecord::Rollback
                end
              ensure
                tempfile.close
                tempfile.unlink
              end
            end
          end
        end
     
        true
      end

      desc 'Download the attachment file'
      get ':attachment_id' do
        params do
          optional :version, type: Integer
        end
        content_type "application/octet-stream"
        header['Content-Disposition'] = 'attachment; filename="' + @attachment.filename + '"'
        env['api.format'] = :binary
        
        uploaded_file = if params[:version].nil?
                           @attachment.attachment_attacher.file
                        else
                          @attachment.reload_log_data
                          @attachment.at(version: params[:version].to_i).attachment_attacher.file
                        end
        data = uploaded_file.read
        uploaded_file.close

        data
      end

      desc "Get all versions of a attachments"
      get ':attachment_id/versions' do
        content_type "application/octet-stream"

        versions = []
        @attachment.reload_log_data
        for numb in 1..@attachment.log_size do
          att = @attachment.at(version: numb)
          att.updated_at = Time.strptime("#{@attachment.log_data.versions[numb-1].data['ts']}", '%Q')
          versions.push att
        end
        Entities::AttachmentEntity.represent(versions)
      end

      desc 'Download the zip attachment file'
      get 'zip/:container_id' do
        env['api.format'] = :binary
        content_type('application/zip, application/octet-stream')
        filename = URI.escape("#{@container.parent&.name.gsub(/\s+/, '_')}-#{@container.name.gsub(/\s+/, '_')}.zip")
        header('Content-Disposition', "attachment; filename=\"#{filename}\"")
        zip = Zip::OutputStream.write_buffer do |zip|
          @container.attachments.each do |att|
            zip.put_next_entry att.filename
            zip.write att.read_file
          end
          file_text = ''
          @container.attachments.each do |att|
            file_text += "#{att.filename} #{att.checksum}\n"
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
        tts = @sample.analyses&.map { |a| a.children&.map { |d| d.attachments&.map { |at| at.filesize } } }&.flatten&.reduce(:+) || 0
        if tts > 300_000_000
          DownloadAnalysesJob.perform_later(@sample.id, current_user.id, false)
          nil
        else
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = URI.escape("#{@sample.short_label}-analytical-files.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = DownloadAnalysesJob.perform_now(@sample.id, current_user.id, true)
          zip.rewind
          zip.read

        end
      end

      desc 'Return image attachment'
      get 'image/:attachment_id' do
        sfilename = @attachment.key + @attachment.extname
        content_type @attachment.content_type
        header['Content-Disposition'] = 'attachment; filename=' + sfilename
        header['Content-Transfer-Encoding'] = 'binary'
        env['api.format'] = :binary
        uploaded_file = @attachment.attachment_attacher.file
        data = uploaded_file.read
        uploaded_file.close

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

      desc 'Regenrate spectra'
      params do
        requires :original, type: Array[Integer]
        requires :generated, type: Array[Integer]
      end
      post 'regenerate_spectrum' do
        pm = to_rails_snake_case(params)
        pm[:generated].each do |g_id|
          att = Attachment.find(g_id)
          next unless att

          can_delete = writable?(att)
          att.destroy if can_delete
        end
        pm[:original].each do |o_id|
          att = Attachment.find(o_id)
          next unless att

          can_write = writable?(att)
          if can_write
            att.set_regenerating
            att.save
          end
        end

        {} # FE does not use the result
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
