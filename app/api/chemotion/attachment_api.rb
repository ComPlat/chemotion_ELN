require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require 'digest'

module Chemotion
  class AttachmentAPI < Grape::API

    rescue_from ActiveRecord::RecordNotFound do |error|
      message = "Could not find attachment"
      error!(message, 404)
    end

    resource :inbox do
      get do
        attachments = Attachment.where(
          :container_id => nil, :created_for => current_user.id
        )
      end
    end

    resource :attachments do
      before do
        case request.env['REQUEST_METHOD']
        when /delete/i
          if @attachment = Attachment.find(params[:attachment_id])
            if element = @attachment.container && @attachment.container.root.containable
              can_delete = ElementPolicy.new(current_user, element).update?
            else
              can_delete = @attachment.created_for == current_user.id
            end
            error!('401 Unauthorized', 401) unless can_delete
          end
        when /post/i

        when /get/i
          if request.url.match(/zip/)
            @container = Container.find(params[:container_id])
            if element = container.root.containable
              can_read = ElementPolicy.new(current_user, element).read?
              can_dwnld = can_read && ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
            end
            error!('401 Unauthorized', 401) unless can_dwnld
          elsif @attachment = Attachment.find(params[:attachment_id])
             element = @attachment.container.root.containable
             can_read = ElementPolicy.new(current_user, element).read?
             can_dwnld = can_read && ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
             error!('401 Unauthorized', 401) unless can_dwnld
          end
        end
      end

      desc "Delete Attachment"
      delete ':attachment_id' do
        @attachment.delete!
      end

      desc "Upload attachments"
      post 'upload_dataset_attachments' do
        params.each do |file_id, file|
          if tempfile = file.tempfile
              a = Attachment.new(
                bucket: file.container_id,
                filename: file.filename,
                key: file.name,
                file_path: file.tempfile,
                created_by: current_user.id,
                created_for: current_user.id,
                content_type: file.type
              )
            begin
              a.save!
            ensure
              tempfile.close
              tempfile.unlink
            end
          end
        end
        true
      end

      desc "Download the attachment file"
      get ':attachment_id' do
        content_type "application/octet-stream"
        header['Content-Disposition'] = "attachment; filename=" + @attachment.filename
        env['api.format'] = :binary
        @attachment.read_file
      end

      desc "Download the zip attachment file"
      get 'zip/:container_id' do
        @container.attachments.each do |att|
          #TODO
        end
      end

      desc 'Return Base64 encoded thumbnail'
      get 'thumbnail/:attachment_id' do
        if @attachment.thumb
          Base64.encode64(@attachment.read_thumbnail)
        else
          nil
        end
      end

      namespace :svgs do
        desc "Get QR Code SVG for element"
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
            ""
          end
        end
      end

    end
  end
end
