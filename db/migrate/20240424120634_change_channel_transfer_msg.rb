class ChangeChannelTransferMsg < ActiveRecord::Migration[6.1]
  def change
    channel = Channel.find_by(subject: Channel::GATE_TRANSFER_NOTIFICATION)
    return if channel.blank?
    msg_template = channel.msg_template
    msg_template['data'] = msg_template['data'].gsub('[chemotion.net]', '')
    channel.update_column(:msg_template, msg_template)
  rescue StandardError => e
    Rails.logger.error "Error changing channel msg: #{e.message}"
  end
end
