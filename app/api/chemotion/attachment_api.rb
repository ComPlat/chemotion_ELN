require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require 'digest'

module Chemotion
  class AttachmentAPI < Grape::API

    resource :inbox do
      get do
        attachments = Attachment.where(:container_id => nil, :created_for => current_user.id)
      end
    end

    resource :attachments do

      desc "Delete Attachment"
      delete ':attachment_id' do
        #todo: authorize
        if current_user
          attachment = Attachment.find_by id: params[:attachment_id]
          if attachment && attachment.created_for == current_user.id
            begin
              attachment.delete
            end
          end
        end
      end

      desc "Upload attachments"
      post 'upload_dataset_attachments' do
        params.each do |file_id, file|
          if tempfile = file.tempfile
              a = Attachment.new(
                bucket: file.container_id,
                filename: file.filename,
                key: file.name,
                #file_data: IO.binread(tempfile),
                file_path: file.tempfile,
                created_by: current_user.id,
                created_for: current_user.id,
                content_type: file.type
              )
            begin
              a.save!
            # rescue
            #   a.destroy
            ensure
              tempfile.close
              tempfile.unlink   # deletes the temp file
            end
          end
        end
        true
      end

      desc "Download the attachment file"
      before do
        attachment = Attachment.find_by id: params[:attachment_id]
        if attachment
          element = attachment.container.root.containable
          can_read = ElementPolicy.new(current_user, element).read?
          can_dwnld  = can_read && ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
          error!('401 Unauthorized', 401) unless can_dwnld
        end
      end
      get ':attachment_id' do
        attachment_id = params[:attachment_id]

        attachment = Attachment.find_by id: attachment_id
        if attachment != nil
          content_type "application/octet-stream"
          header['Content-Disposition'] = "attachment; filename="+attachment.filename
          env['api.format'] = :binary

          attachment.read_file
        else
          nil
        end
      end

      #todo: authorize attachment download
      desc "Download the zip attachment file"
      get 'zip/:container_id' do
        container_id = params[:container_id]

        if Container.exists?(id: container_id)

        end
      end

      resource :thumbnail do
        desc 'Return Base64 encoded thumbnail'
        get ':id' do

          attachment = Attachment.find_by id: params[:id]
          if attachment
            Base64.encode64(attachment.read_thumbnail)
          else
            nil
          end
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
