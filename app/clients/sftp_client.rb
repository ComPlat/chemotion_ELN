class SFTPClient
  def self.with_default_settings
    @with_default_settings ||= self.new(
      {
        host: ENV['SFTP_HOST'],
        port: ENV['SFTP_PORT'],
        username: ENV['SFTP_USER'],
        password: (ENV['SFTP_PASSWORD'] if ENV['SFTP_PASSWORD']),
        keys: (ENV['SFTP_KEYS'] if ENV['SFTP_KEYS'])
      }
    )
  end

  def initialize(sftp_config)
    @host = sftp_config.fetch(:host, nil)
    @port = sftp_config.fetch(:port, nil)
    @username = sftp_config.fetch(:username, nil)
    @password = sftp_config.fetch(:password, nil)

    # This specifies the list of private key files to use instead of the
    # defaults ($HOME/.ssh/id_dsa, $HOME/.ssh2/id_dsa, $HOME/.ssh/id_rsa, and $HOME/.ssh2/id_rsa).
    # The value of this option should be an array of strings.
    # See http://net-ssh.github.io/ssh/v1/chapter-2.html
    @keys = sftp_config.fetch(:keys, [])
  end

  def upload_file!(local_path, remote_path)
    with_session(local_path, remote_path) do |sftp|
      sftp.upload!(local_path, remote_path)
    end
  end

  def write_to_file!(remote_path, content)
    with_session(remote_path, content) do |sftp|
      # SFTP offers a file write method, but upload!
      # let's us put the file on byte-basis (binary transfer)
      # in contrast to ASCII transfer
      # http://stackoverflow.com/a/11034080/359326
      io = StringIO.new(content.encode(Encoding::UTF_8))
      sftp.upload!(io, remote_path)
    end
  end

  def download_file!(remote_path, local_path)
    with_session(remote_path, local_path) do |sftp|
      sftp.download!(remote_path, local_path)
    end
  end

  def move_file!(remote_src_path, remote_target_path)
    with_session(remote_src_path, remote_target_path) do |sftp|
      sftp.rename(remote_src_path, remote_target_path).wait
      sftp.remove(remote_src_path).wait
    end
  end

  def remove_file!(remote_path)
    with_session(remote_path) do |sftp|
      sftp.remove(remote_path).wait
    end
  end

  def read_file(remote_path)
    with_session(remote_path) do |sftp|
      sftp.download!(remote_path).to_s.encode('UTF-8')
    end
  end

  def file_exists?(remote_path)
    with_session(remote_path) do |sftp|
      begin
        sftp.stat!(remote_path)
      rescue Net::SFTP::StatusException => e
        if e.code == 2 # No such file
          return false
        else
          raise e
        end
      end
      true
    end
  end

  private

    def with_session(*args_of_caller)
      begin
        if @keys.blank?
          Net::SFTP.start(@host, @username, port: @port, password: @password) do |sftp|
            data = yield(sftp)
            return data if data
          end
        else
          Net::SFTP.start(@host, @username, port: @port, keys: @keys) do |sftp|
            data = yield(sftp)
            return data if data
          end
        end
      rescue Exception => e
        # for usage of caller, see Kernel#caller
        raise SFTPClientError.new(e, caller[1], args_of_caller)
      end
    end

end
