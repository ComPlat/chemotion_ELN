# frozen_string_literal: true

# on_read looks attachments up by their Shrine file id (attachment_data->>'id')
# on every file read; without this index that is a sequential scan per read.
class IndexAttachmentsOnShrineFileId < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def change
    add_index :attachments, "((attachment_data ->> 'id'))",
              name: 'index_attachments_on_shrine_file_id',
              algorithm: :concurrently
  end
end
