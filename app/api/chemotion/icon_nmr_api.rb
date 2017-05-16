module Chemotion
  class IconNmrAPI < Grape::API
    resource :icon_nmr do
      namespace :config do
        desc "Create config file and send to SFTP Server"
        params do
          requires :data, type: Array
          requires :sample_id, type: Integer
        end
        post do
          filename = "#{Time.now.utc.strftime("%Y-%m-%d-%H%M%S")}-#{params[:sample_id]}"
          content = params[:data].flat_map{|e| e.map {|k, v| "#{k} #{v}"}}.join("\n") ++ "\nEND"
          
          begin
            SFTPClient.with_default_settings.write_to_file!("#{ENV['SFTP_UPLOAD_FOLDER']}/#{filename}", content)
          rescue SFTPClientError => error
            error!(error.message, 500)
          end

          {}
        end
      end
    end
  end
end

