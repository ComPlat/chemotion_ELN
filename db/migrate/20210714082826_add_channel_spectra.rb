# frozen_string_literal: true
class AddChannelSpectra < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_by(subject: Channel::CHEM_SPECTRA_NOTIFICATION)
    if (channel.nil?)
      attributes = {
        subject: Channel::CHEM_SPECTRA_NOTIFICATION,
        channel_type: 8,
        msg_template: '{"data": "%{msg}"}'
      }
      Channel.create(attributes)
    end
  end
end
