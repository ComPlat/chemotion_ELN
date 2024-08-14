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
    options = {
      password: prms[:password],
      auth_methods: ['password'],
      number_of_password_prompts: 0,
    }
    sftp_start_with_options(prms, options)
  end

  def connect_sftp_with_key(prms)
    options = {
      key_data: [],
      keys: key_path(prms[:datacollector_key_name]),
      keys_only: true,
    }
    sftp_start_with_options(prms, options)
  end

  def sftp_start_with_options(prms, options)
    uri = URI.parse("ssh://#{prms[:datacollector_host]}")
    options[:port] = uri.port if uri.port
    options[:timeout] = 5
    options[:non_interactive] = true
    sftp = Net::SFTP.start(
      uri.host,
      prms[:datacollector_user],
      **options,
    )
    raise 'Connection can not be initialized!' unless sftp.open?
  ensure
    sftp.nil? || sftp.close_channel
  end
end
