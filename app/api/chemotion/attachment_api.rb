module Chemotion
  class AttachmentAPI < Grape::API
    resource :attachments do

      #todo: move to AttachmentAPI
      desc "Upload attachments"
      post 'upload_dataset_attachments' do
        params.each do |file_id, file|
          if tempfile = file.tempfile
            begin
              storage = Filesystem.new
              file_id_filename = file_id + file.filename

              storage.temp(file_id_filename, IO.binread(tempfile))
            ensure
              tempfile.close
              tempfile.unlink   # deletes the temp file
            end
          end
        end
        true
      end

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
