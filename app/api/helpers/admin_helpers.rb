# frozen_string_literal: true

# A helper for admin_api
module AdminHelpers
  extend Grape::API::Helpers

  def key_path(key_name)
    key_dir = Rails.configuration.datacollectors.keydir
    kp = if key_dir.start_with?('/')
           Pathname.new(key_dir).join(key_name)
         else
           Rails.root.join(key_dir, key_name)
         end
    error!('No key file found', 500) unless kp.file? && kp.exist?
    kp
  end

  def connect_sftp_with_password(prms)
    sftp = Net::SFTP.start(
      prms[:host],
      prms[:user],
      password: prms[:password],
      auth_methods: ['password'],
      number_of_password_prompts: 0,
      timeout: 5
    )
    raise 'Connection can not be initialized!' unless sftp.open?
  ensure
    sftp.nil? || sftp.close_channel
  end

  def connect_sftp_with_key(prms)
    sftp = Net::SFTP.start(
      prms[:host],
      prms[:user],
      key_data: [],
      keys: key_path(prms[:key_name]),
      keys_only: true,
      timeout: 5
    )
    raise 'Connection can not be initialized!' unless sftp.open?
  ensure
    sftp.nil? || sftp.close_channel
  end
end
