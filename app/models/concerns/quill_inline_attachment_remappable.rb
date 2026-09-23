# frozen_string_literal: true

module QuillInlineAttachmentRemappable
  extend ActiveSupport::Concern

  INLINE_BLOT_KEYS = %w[attachment-image attachment-file].freeze

  def update_body_attachments(original_identifier, copy_identifier)
    remap_richtext_attachment_identifiers(original_identifier, copy_identifier)
    save!
  end

  private

  def remap_delta_op_identifiers(delta, original_identifier, copy_identifier)
    ops = delta.is_a?(Hash) ? delta['ops'] : nil
    return unless ops.is_a?(Array)

    ops.each do |op|
      insert = op.is_a?(Hash) ? op['insert'] : nil
      remap_insert_blots(insert, original_identifier, copy_identifier) if insert.is_a?(Hash)
    end
  end

  def remap_insert_blots(insert, original_identifier, copy_identifier)
    INLINE_BLOT_KEYS.each do |blot_key|
      payload = insert[blot_key]
      next unless payload.is_a?(Hash) && payload['attachment_identifier'] == original_identifier

      payload['attachment_identifier'] = copy_identifier
    end
  end
end
