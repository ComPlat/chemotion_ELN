require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require 'digest'

module Chemotion
  class AttachmentJwtAPI < Grape::API
    helpers do
      def thumbnail(att)
        att.thumb ? Base64.encode64(att.read_thumbnail) : nil
      end

      def thumbnail_obj(att)
        { id: att.id, thumbnail: thumbnail(att) }
      end

      def raw_file(att)
        begin
          Base64.encode64(att.read_file)
        rescue
          nil
        end
      end

      def raw_file_obj(att)
        {
          id: att.id,
          file: raw_file(att),
          predictions: JSON.parse(att.get_infer_json_content())
        }
      end

      def created_for_current_user(att)
        att.container_id.nil? && att.created_for == current_user_id
      end

      def validate_uuid_format(uuid)
        uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return true if uuid_regex.match?(uuid.to_s.downcase)

        return false
      end
    end

    rescue_from ActiveRecord::RecordNotFound do |error|
      message = "Could not find attachment"
      error!(message, 404)
    end

    resource :attachments_jwt do
      before do
        @attachment = Attachment.find_by(id: params[:attachment_id])
        case request.env['REQUEST_METHOD']
        when /delete/i
          error!('401 Unauthorized', 401) unless @attachment
          can_delete = writable?(@attachment)
          error!('401 Unauthorized', 401) unless can_delete
        # when /post/i
        when /get/i
          current_user = User.find(@current_user_id)
          @user_ids ||= current_user ? (current_user.group_ids + [@current_user_id]) : [0]
          can_dwnld = false
          if /zip/.match?(request.url)
            @container = Container.find(params[:container_id])
            if (element = @container.root.containable)
              can_read = ElementPolicy.new(current_user, element).read?
              can_dwnld = can_read &&
                          ElementPermissionProxy.new(current_user, element, @user_ids).read_dataset?
            end
          elsif /sample_analyses/.match?(request.url)
            @sample = Sample.find(params[:sample_id])
            if (element = @sample)
              can_read = ElementPolicy.new(current_user, element).read?
              can_dwnld = can_read &&
                          ElementPermissionProxy.new(current_user, element, @user_ids).read_dataset?
            end
          elsif @attachment
            can_dwnld = @attachment.container_id.nil? && @attachment.created_for == current_user.id
            if !can_dwnld && (element = @attachment.container&.root&.containable)
              can_dwnld = element.is_a?(User) && (element == current_user) ||
                          ElementPolicy.new(current_user, element).read? &&
                          ElementPermissionProxy.new(current_user, element, @user_ids).read_dataset?
            end
          end
          error!('401 Unauthorized', 401) unless can_dwnld
        end
      end

      desc "Download the attachment file"
      get ':attachment_id' do
        @attachment = Attachment.find_by(id: params[:attachment_id])
        content_type "application/octet-stream"
        header['Content-Disposition'] = 'attachment; filename="' + @attachment.filename + '"'
        env['api.format'] = :binary
        @attachment.read_file
      end

      desc "Download the zip attachment file"
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
          file_text = "";
          @container.attachments.each do |att|
            file_text += "#{att.filename} #{att.checksum}\n"
          end
          hyperlinks_text = ""
          JSON.parse(@container.extended_metadata.fetch('hyperlinks', nil)).each do |link|
            hyperlinks_text += "#{link} \n"
          end
          zip.put_next_entry "dataset_description.txt"
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

      desc 'Upload attachments'
      params do
        requires :file, type: File
        optional :attachable_id, type: Integer, default: 0
        optional :attachable_type, type: String
      end
      post 'upload_attachments' do
        file = params[:file]
        next unless tempfile = file[:tempfile]

        a = Attachment.new(
          bucket: file[:container_id],
          filename: file[:filename],
          key: file[:name],
          file_path: file[:tempfile],
          created_by: @current_user_id,
          created_for: @current_user_id,
          content_type: file[:type],
          attachable_id: params[:attachable_id],
          attachable_type: params[:attachable_type]
        )
        begin
          a.save!
        ensure
          tempfile.close
          tempfile.unlink
        end

        token = http_auth_header
        @cache.store(token, @current_user_id)

        true
      end
    end
  end
end
