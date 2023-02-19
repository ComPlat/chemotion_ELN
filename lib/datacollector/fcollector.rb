# frozen_string_literal: true

# File and Folder Collector
class Fcollector
  def execute(use_sftp)
    raise 'No datacollector configuration!' unless Rails.configuration.datacollectors

    unless use_sftp
      @sftp = nil
      devices(use_sftp).each { |device| inspect_folder(device) }
      return
    end

    devices(use_sftp).each do |device|
      @current_collector = nil
      method_params = device.profile.data['method_params']
      host = method_params['host']

      case method_params['authen']
      when 'keyfile'
        user = method_params['user']
        args = {
          key_data: [],
          keys: key_path(method_params['key_name']),
          keys_only: true
        }
      when 'password', nil
        credentials = Rails.configuration.datacollectors.sftpusers.find do |e|
          e[:user] == method_params['user']
        end
        unless credentials
          log_info("No match user credentials! user: #{method_params['user']}", device)
          next
        end
        user = credentials[:user]
        args = { password: credentials[:password] }
      else
        user = nil
        args = {}
        log_info('connection method is unknown!', device)
        next
      end
      Net::SFTP.start(host, user, **args) do |sftp|
        @sftp = sftp
        inspect_folder(device)
        @sftp = nil
      end
    end
  end

  private

  def devices(use_sftp)
    sql = <<~SQL
      profiles."data"->>'method' = '#{self.class::FCOLL}watcher#{use_sftp ? 'sftp' : 'local'}'
    SQL
    Device.joins(:profile).where(sql).includes(:profile)
  end

  def key_path(key_name)
    key_dir = Rails.configuration.datacollectors.keydir
    kp = if key_dir.start_with?('/')
           Pathname.new(key_dir).join(key_name)
         else
           Rails.root.join(key_dir, key_name)
         end
    raise 'No key file found' unless kp.file? && kp.exist?

    kp
  end

  def log_info(message, device)
    DCLogger.log.info(self.class.name) do
      "#{@current_collector&.path} >>> #{message} >>> #{device_info(device)}"
    end
  end

  def log_error(message, device)
    DCLogger.log.error(self.class.name) do
      "#{@current_collector&.path} >>> #{message} >>> #{device_info(device)}"
    end
  end

  def device_info(device)
    "Device ID: #{device.id}, Name: #{device.first_name} #{device.last_name}"
  end
end
