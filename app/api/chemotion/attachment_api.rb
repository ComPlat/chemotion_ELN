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

      def validate_uuid_format(uuid)
        uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return true if uuid_regex.match?(uuid.to_s.downcase)

        false
      end
    end

    rescue_from ActiveRecord::RecordNotFound do |_error|
      message = 'Could not find attachment'
      error!(message, 404)
    end

    resource :attachments do
      before do
        @attachment = Attachment.find_by(id: params[:attachment_id])
        case request.env['REQUEST_METHOD']
        when /delete/i
          error!('401 Unauthorized', 401) unless writable?(@attachment)
        # when /post/i
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
        params.each do |_file_id, file|
          next unless tempfile = file[:tempfile]

          a = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: file[:name],
            file_path: file[:tempfile],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type]
          )
          begin
            a.save!
          ensure
            tempfile.close
            tempfile.unlink
          end
        end
        true
      end

      desc 'Upload large file as chunks'
      post 'upload_chunk' do
        params do
          require :file, type: File, desc: 'file'
          require :counter, type: Integer, default: 0
          require :key, type: String
        end
        return { ok: false, statusText: 'File key is not valid' } unless validate_uuid_format(params[:key])

        FileUtils.mkdir_p(Rails.root.join('tmp/uploads', 'chunks'))
        File.open(Rails.root.join('tmp/uploads', 'chunks', "#{params[:key]}$#{params[:counter]}"), 'wb') do |file|
          File.open(params[:file][:tempfile], 'r') do |data|
            file.write(data.read)
          end
        end

        true
      end

      desc 'Upload completed'
      post 'upload_chunk_complete' do
        params do
          require :filename, type: String
          require :key, type: String
        end
        return { ok: false, statusText: 'File key is not valid' } unless validate_uuid_format(params[:key])

        begin
          file_name = ActiveStorage::Filename.new(params[:filename]).sanitized
          FileUtils.mkdir_p(Rails.root.join('tmp/uploads', 'full'))
          entries = Dir["#{Rails.root.join('tmp/uploads', 'chunks', params[:key])}*"].sort_by { |s| s.scan(/\d+/).last.to_i }
          file_path = Rails.root.join('tmp/uploads', 'full', params[:key])
          file_path = "#{file_path}#{File.extname(file_name)}"
          file_checksum = Digest::MD5.new
          File.open(file_path, 'wb') do |outfile|
            entries.each do |file|
              buff = File.open(file, 'rb').read
              file_checksum.update(buff)
              outfile.write(buff)
            end
          end

          if file_checksum == params[:checksum]
            attach = Attachment.new(
              bucket: nil,
              filename: file_name,
              key: params[:key],
              file_path: file_path,
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: MIME::Types.type_for(file_name)[0].to_s
            )

            attach.save!

            return true
          else
            return { ok: false, statusText: 'File upload has error. Please try again!' }
          end
        ensure
          entries.each do |file|
            File.delete(file) if File.exist?(file)
          end
          File.delete(file_path) if File.exist?(file_path)
        end
      end

      desc 'Upload files to Inbox as unsorted'
      post 'upload_to_inbox' do
        attach_ary = []
        params.each do |_file_id, file|
          next unless tempfile = file[:tempfile]

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
          begin
            attach.save!
            attach_ary.push(attach.id)
          ensure
            tempfile.close
            tempfile.unlink
          end
        end
        TransferFileFromTmpJob.set(queue: "transfer_file_from_tmp_#{current_user.id}")
                              .perform_later(attach_ary)

        true
      end

      desc 'Download the attachment file'
      get ':attachment_id' do
        content_type 'application/octet-stream'
        header['Content-Disposition'] = 'attachment; filename="' + @attachment.filename + '"'
        env['api.format'] = :binary
        @attachment.read_file
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
        @attachment.read_file
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
