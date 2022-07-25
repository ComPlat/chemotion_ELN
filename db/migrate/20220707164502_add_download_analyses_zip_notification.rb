class AddDownloadAnalysesZipNotification < ActiveRecord::Migration[5.2]
  def change
    channel = Channel.find_or_create_by(subject: Channel::DOWNLOAD_ANALYSES_ZIP)
    attributes = {
      subject: Channel::DOWNLOAD_ANALYSES_ZIP,
      channel_type: 8,
      msg_template: {"data": "Download analyses of sample: %{sample_name} processed successfully. %{expires_at}",
                      "level": "success"
                     }
    }
    channel.update(attributes) if channel

    channel = Channel.find_or_create_by(subject: Channel::DOWNLOAD_ANALYSES_ZIP_FAIL)
    attributes = {
      subject: Channel::DOWNLOAD_ANALYSES_ZIP_FAIL,
      channel_type: 8,
      msg_template: {"data": " There was an issue while downloading the analyses of sample: %{sample_name}",
                      "level": "error"
                     }
    }
    channel.update(attributes) if channel
  end
end
