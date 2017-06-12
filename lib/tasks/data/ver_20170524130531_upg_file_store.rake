# frozen_string_literal: true
namespace :data do
  desc 'update attachment attributes'
  task ver_20170524130531_upg_file_store: :environment do
    Attachment.find_each do |attachment|
      if attachment.storage == 'local'
        attachment.update_columns(
          key: File.join(
            attachment.created_by.to_s,
            attachment.identifier + '_' + attachment.filename
          ),
          storage: 'local_user'
        )
        attachment.regenerate_thumbnail
      elsif attachment.storage == 'temp'
        attachment.update_columns(
          key: File.join(
            attachment.created_by.to_s,
            attachment.identifier + '_' + attachment.filename
          ),
          storage: 'local_user'
        )
        if File.exist?(attachment.storage.path)
          attachment.regenerate_thumbnail
        else
          attachment.update_columns(
            storage: 'void'
          )
        end
      end
    end
  end
end
