# frozen_string_literal: true

# desc: Fix broken conversion of tiff derivatives
class FixTiffDerivatives < ActiveRecord::Migration[6.1]
  def change
    Attachment.where("attachment_data ->'metadata'->>'mime_type' = ? ", 'image/tiff')
              .where("attachment_data ->'derivatives'->'conversion'->> 'id' ilike '/%' ")
              .find_each do |attachment|
      attachment_data = attachment.attachment_data
      derivatives = attachment_data['derivatives']
      derivatives.delete('conversion')
      attachment_data['derivatives'] = derivatives
      attachment.attachment_data = attachment_data
      attacher = attachment.attachment_attacher
      old_derivatives = attacher.derivatives
      attacher.set_derivatives({})
      attacher.create_derivatives
      attachment.update_column(:attachment_data, attachment.attachment_data)
    end
  end
end
