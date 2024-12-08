# frozen_string_literal: true

class SFTPClient
  ALLOWED_OPTIONS = %i[
    port password keys keys_only auth_methods timeout verbose key_data number_of_password_prompts
  ].freeze

  def self.with_default_settings
    @with_default_settings ||= new(
      host: ENV.fetch('SFTP_HOST', nil),
      user: ENV.fetch('SFTP_USER', nil),

      port: ENV.fetch('SFTP_PORT', nil),
      password: ENV.fetch('SFTP_PASSWORD', nil),
      keys: ENV.fetch('SFTP_KEYS', nil),
      auth_methods: ENV.fetch('SFTP_AUTH_METHODS', nil),
    )
  end

  attr_reader :host, :user, :session_options

  # Initialize the SFTP parameters with the given host, username and options
  # to be passed to the Net::SFTP.start method.
  #
  # @param host [String] the host to connect to
  # @param user [String] the username to use for the connection
  # @param options [Hash] the options to pass to the Net::SFTP.start method
  # @options options [String] :port the port to connect to
  # @options options [String] :password the password to use for the connection
  # @options options [Array<String>] :keys the key files to use for the connection
  # @options options [Boolean] :keys_only whether to use only the keys for the connection
  # @options options [Array<String>] :auth_methods the authentication methods to use
  # @options options [Integer] :timeout the timeout to use for the connection
  # @options options [Boolean] :verbose whether to be verbose
  # @options options [Array<String>] :key_data the key data to use for the connection
  # @example new('example.com', 'user', { port: '2222', password: 'password' })
  # @example new('sfpt://john@foo.bar:1234/unrelevant')
  # @note see ALLOWED_OPTIONS for the allowed options
  # @note optional user and port params have precedence over the parsed ones from the host
  def initialize(host = nil, user = nil, **options)
    extract_host_and_user(host, user, **options)
    raise ArgumentError, 'No host or user given' unless @host && @user

    %i[auth_methods keys].each do |key|
      options[key] = options[key].split(',') if options[key].is_a?(String)
    end
    default_options(options)
    @session_options = @session_options.merge(options.slice(*ALLOWED_OPTIONS)).compact
  end

  # Test the connection to the SFTP server
  # @return [Boolean] whether the connection was successful
  def open?
    with_session(&:open?)
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

  def download_directory!(remote_path, local_path)
    with_session(remote_path, local_path) do |sftp|
      sftp.download!(remote_path, local_path, requests: 5, recursive: true)
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
      sftp.remove!(remote_path)
    end
  end

  def remove_dir!(remote_path)
    with_session(remote_path) do |sftp|
      sftp.session.exec!("rm -rf #{remote_path}")
    end
  end

  def read_file(remote_path)
    with_session(remote_path) do |sftp|
      sftp.download!(remote_path).to_s.encode('UTF-8')
    end
  end

  def exist?(remote_path)
    with_session do |sftp|
      sftp.stat!(remote_path) && true
    rescue Net::SFTP::StatusException => e
      return false if e.code == 2 # No such file

      raise e
    end
  end

  def file?(remote_path)
    parent = File.dirname(remote_path)
    name = File.basename(remote_path)
    result = nil
    with_session do |sftp|
      result = sftp.dir.glob(parent, name).find(&:file?).present?
    end
    result
  end

  def directory?(remote_path)
    parent = File.dirname(remote_path)
    name = File.basename(remote_path)
    result = nil
    with_session(parent) do |sftp|
      result = sftp.dir.glob(parent, name).find(&:directory?).present?
    end
    result
  end

  def entries(remote_path)
    with_session(remote_path) do |sftp|
      sftp.dir.entries(remote_path)
    end
  end

  def glob(remote_path, pattern, flags = 0)
    with_session do |sftp|
      sftp.dir.glob(remote_path, pattern, flags)
    end
  end

  private

  # Extract Host, User and Port from the given URI
  def extract_host_and_user(host, user, **options)
    # extract host information from the given host, remove protocol prefix if present
    host = (host.presence || options.delete(:host)).sub(%r{^[a-z]+://}, '')
    uri = URI.parse("ssh://#{host}")
    @host = uri.host
    @user = user || uri.user || options.delete(:user)
    @root_path = options.delete(:root_path) || (uri.path != '/' && uri.path.presence)
    @session_options = { port: uri.port }
  end

  # Set some default options
  def default_options(options)
    @session_options = @session_options.merge(
      timeout: 5, verbose: :warn, keys_only: true, auth_methods: [], number_of_password_prompts: 0,
    )
    @session_options[:auth_methods] = %w[publickey] if options[:keys].present? || options[:key_data].present?
    @session_options[:auth_methods] += %w[password] if options[:password].present?
    @session_options[:auth_methods] = %w[publickey] if options[:keys_only].present?
  end

  # rubocop:disable Lint/RescueException
  def with_session(*args_of_caller)
    Net::SFTP.start(@host, @user, @session_options) do |sftp|
      data = yield(sftp)
      return data unless data.nil?
    end
  rescue Exception => e
    # for usage of caller, see Kernel#caller
    raise SFTPClientError.new(e, caller(2..2).first, args_of_caller)
  end
  # rubocop:enable Lint/RescueException
end
