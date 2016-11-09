module Chemotion
  class AttachmentAPI < Grape::API
    resource :attachments do

      resource :thumbnails do
        desc 'Return Base64 encoded thumbnail'
        get do
          thumbnail_dir = File.join('uploads', 'thumbnails')
          thumbnail_path = "#{thumbnail_dir}/#{params[:filename]}.png"

          if File.exist?(thumbnail_path)
            Base64.encode64(File.open(thumbnail_path, 'rb').read)
          else
            nil
          end
        end
      end


      resource :thumbnail do
        desc 'Return Base64 encoded thumbnail'
        get do
          if Attachment.exists?(:id => params[:id])
            attachment = Attachment.find_by id: params[:id]
            storage = Filesystem.new
            storage.read_thumbnail(current_user, attachment)
          else
            nil
          end
        end
      end

    end
  end
end
