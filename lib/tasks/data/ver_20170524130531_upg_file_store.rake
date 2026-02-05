# frozen_string_literal: true

namespace :data do
  desc 'update attachment attributes'
  task ver_20170524130531_upg_file_store: :environment do
    Attachment.find_each do |attachment|
      if attachment.storage == 'local'
        attachment.update_columns(
          key: File.join(
            attachment.created_by.to_s,
            attachment.identifier + '_' + attachment.filename,
          ),
          storage: 'local_user',
        )
        attachment.attachment_attacher.create_derivatives
      elsif attachment.storage == 'temp'
        attachment.update_columns(
          key: File.join(
            attachment.created_by.to_s,
            attachment.identifier + '_' + attachment.filename,
          ),
          storage: 'local_user',
        )
        if attachment.attachment&.exists?
          attachment.attachment_attacher.create_derivatives
        else
          attachment.update_columns(attachment_data: nil)
        end
      end
    end
  end
end
