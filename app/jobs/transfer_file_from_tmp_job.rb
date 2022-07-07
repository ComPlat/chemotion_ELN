class TransferFileFromTmpJob < ApplicationJob
  queue_as :transfer_file_from_tmp

  def perform(attach_ary)
    primary_store = Rails.configuration.storage.primary_store
    begin
      attach_ary.each do |attach_id|
        attachment = Attachment.find_by(id: attach_id)
        next unless attachment

        if attachment.storage == 'tmp'
          attachment.update!(storage: primary_store)
        end
      end
    end
  end
end
