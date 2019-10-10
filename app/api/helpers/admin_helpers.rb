# frozen_string_literal: true

# A helper for admin_api
module AdminHelpers
  extend Grape::API::Helpers
  def connect_sftp_with_password(params)
    sftp = Net::SFTP.start(
      params[:host],
      params[:user],
      password: params[:password],
      auth_methods: ['password'],
      number_of_password_prompts: 0,
      timeout: 5
    )
    raise 'Connection can not be initialized!' unless sftp.open?

    sftp
  end

  def connect_sftp_with_key(params)
    sftp = Net::SFTP.start(
      params[:host],
      params[:user],
      key_data: [],
      keys: params[:key_path],
      keys_only: true,
      timeout: 5
    )
    raise 'Connection can not be initialized!' unless sftp.open?

    sftp
  end
end
