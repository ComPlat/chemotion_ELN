# frozen_string_literal: true

# File and Folder Collector
class Fcollector
  # rubocop:disable Metrics/CyclomaticComplexity
  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/MethodLength
  # rubocop:disable Metrics/PerceivedComplexity

  def execute(use_sftp)
    raise 'No datacollector configuration!' unless Rails.configuration.datacollectors

    unless use_sftp
      @sftp = nil
      devices(use_sftp).each { |device| inspect_folder(device) }
      return
    end

    devices(use_sftp).each do |device| # rubocop:disable Metrics/BlockLength
      @current_collector = nil
      method_params = device.profile.data['method_params']
      host = method_params['host']
      case method_params['authen']
      when 'keyfile'
        user = method_params['user']
        kp = key_path(method_params['key_name'])
        unless kp.file? && kp.exist?
          log_info "No key file found <<< #{device.info}" unless kp.file? && kp.exist?
          next
        end

        args = {
          key_data: [],
          keys: kp,
          auth_methods: %w[publickey],
          verbose: :error,
          keys_only: true,
        }
      when 'password', nil
        credentials = Rails.configuration.datacollectors.sftpusers.find do |user_attr|
          user_attr[:user] == method_params['user']
        end
        unless credentials
          log_info("No match user credentials! user: #{method_params['user']} >>> #{device.info}")
          next
        end
        user = credentials[:user]
        args = {
          password: credentials[:password],
        }
      else
        user = nil
        args = {}
        log_info("connection method is unknown! >>> #{device.info}")
        next
      end
      args[:timeout] = 10
      args[:number_of_password_prompts] = 0

      begin
        Net::SFTP.start(host, user, **args) do |sftp|
          @sftp = sftp
          inspect_folder(device)
          @sftp = nil
        end
      rescue StandardError => e
        log_error("#{e.message} >>> #{device.info}\n#{e.backtrace.join('\n')}")
      end
    end
  end

  # rubocop:enable Metrics/CyclomaticComplexity
  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/MethodLength
  # rubocop:enable Metrics/PerceivedComplexity

  private

  def devices(use_sftp)
    sql = <<~SQL.squish
      profiles."data"->>'method' = '#{self.class::FCOLL}watcher#{use_sftp ? 'sftp' : 'local'}'
    SQL
    Device.joins(:profile).where(sql).includes(:profile)
  end

  def key_path(key_name)
    key_dir = Rails.configuration.datacollectors.keydir
    if key_dir.start_with?('/')
      Pathname.new(key_dir).join(key_name)
    else
      Rails.root.join(key_dir, key_name)
    end
  end

  def log_info(message)
    DCLogger.log.info(self.class.name) do
      "#{@current_collector&.path} >>> #{message}"
    end
  end

  def log_error(message)
    DCLogger.log.error(self.class.name) do
      "#{@current_collector&.path} >>> #{message}"
    end
  end

  def new_folders(monitored_folder_p)
    if @sftp
      new_folders_p = @sftp.dir.glob(monitored_folder_p, '*').select(
        &:directory?
      )
      new_folders_p.map! { |dir| File.join(monitored_folder_p, dir.name) }
    else
      new_folders_p = Dir.glob(File.join(monitored_folder_p, '*')).select do |e|
        File.directory?(e)
      end
    end
    new_folders_p
  end
end
