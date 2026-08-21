# frozen_string_literal: true

# The collection export notification now reports attachments that had to be left out of the
# archive (no shrine metadata, or the file is gone from storage). Channel#msg_template is
# rendered with Kernel#format, so the placeholder has to exist in the template before the
# job can pass the value.
#
# NB: Channel::COLLECTION_ZIP is shared with ImportCollectionsJob - a missing key makes
# format raise KeyError, so every producer on this channel must pass +skipped+.
class AddSkippedToCollectionZipNotification < ActiveRecord::Migration[6.1]
  # Kernel#format named references, as consumed by Channel.build_message.
  # rubocop:disable Style/FormatStringToken
  WITH_SKIPPED = 'Collection %{operation}: %{col_labels} processed successfully. ' \
                 '%{expires_at}%{skipped}'
  WITHOUT_SKIPPED = 'Collection %{operation}: %{col_labels} processed successfully. %{expires_at}'
  # rubocop:enable Style/FormatStringToken

  def up
    update_template(WITH_SKIPPED)
  end

  def down
    update_template(WITHOUT_SKIPPED)
  end

  private

  def update_template(data)
    channel = Channel.find_by(subject: Channel::COLLECTION_ZIP)
    return if channel.nil?

    template = channel.msg_template
    return if template.blank?

    channel.update(msg_template: template.merge('data' => data))
  end
end
