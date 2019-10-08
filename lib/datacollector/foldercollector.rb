# frozen_string_literal: true

require 'zip'

class Foldercollector
  def execute(use_sftp)
    unless Rails.configuration.datacollectors
      raise 'No datacollector configuration!'
    end
    devices(use_sftp).each do |device|
      if use_sftp
        credentials = Rails.configuration.datacollectors.sftpusers.select { |e|
          e[:user] == device.profile.data['method_params']['user']
        }.first
        if credentials
          Net::SFTP.start(
            device.profile.data['method_params']['host'],
            credentials[:user],
            password: credentials[:password]
          ) do |sftp|
            @sftp = sftp
            inspect_folder(device)
          end
        end
      else
        @sftp = nil
        inspect_folder(device)
      end
    end
  end

  private

  def devices(use_sftp)
    if use_sftp
      Device.all.select { |e|
        e.profile.data && e.profile.data['method'] == 'folderwatchersftp'
      }
    else
      Device.all.select { |e|
        e.profile.data && e.profile.data['method'] == 'folderwatcherlocal'
      }
    end
  end

  def sleep_seconds(device)
    30 || Rails.configuration.datacollectors.services &&
      (Rails.configuration.datacollectors.services.find { |e|
        e[:name] == device.profile.data['method']
      } || {})[:watcher_sleep]
  end

  def modification_time_diff(device, folder_p)
    time_now = Time.now
    time_diff =
      case device.profile.data['method']
      when 'folderwatcherlocal' then time_now - File.mtime(folder_p)
      when 'folderwatchersftp' then
        time_now - (Time.at @sftp.file.open(folder_p).stat.attributes[:mtime])
      else 30
      end
    time_diff
  end

  def inspect_folder(device)
    params = device.profile.data['method_params']
    sleep_time = sleep_seconds(device).to_i
    new_folders(params['dir']).each do |new_folder_p|
      if (params['number_of_files'].blank? || (params['number_of_files']).to_i.zero?) &&
         modification_time_diff(device, new_folder_p) < 30
        sleep sleep_time
      end

      @current_folder = DatacollectorFolder.new(new_folder_p, @sftp)
      @current_folder.files = list_files
      error = CollectorError.find_by error_code: CollectorHelper.hash(
        @current_folder.path,
        @sftp
      )
      begin
        stored = false
        if @current_folder.recipient
          if params['number_of_files'].present? && params['number_of_files'].to_i != 0 &&
             @current_folder.files.length != params['number_of_files'].to_i
            log_info 'Wrong number of files!'
            next
          end
          unless error
            @current_folder.collect(device)
            log_info 'Stored!'
            stored = true
          end
          @current_folder.delete
          log_info 'Status 200'
        else # Recipient unknown
          @current_folder.delete
          log_info 'Recipient unknown. Folder deleted!'
        end
      rescue => e
        if stored
          CollectorHelper.write_error(
            CollectorHelper.hash(@current_folder.path, @sftp)
          )
        end
        log_error e.backtrace.join('\n')
      end
    end
  end

  def list_files
    if @sftp
      all_files = @sftp.dir.entries(@current_folder.path).reject(
        &:directory?
      )
      all_files.map!(&:name)
    else
      all_files = Dir.entries(@current_folder.path).reject { |e|
        File.directory?(File.join(@current_folder.path, e))
      }
    end
    all_files.delete_if do |f|
      f.end_with?('..', '.', '.filepart', '.part')
    end
    all_files
  end

  def new_folders(monitored_folder_p)
    if @sftp
      new_folders_p = @sftp.dir.glob(monitored_folder_p, '*').select(
        &:directory?
      )
      new_folders_p.map! { |dir| File.join(monitored_folder_p, dir.name) }
    else
      new_folders_p = Dir.glob(File.join(monitored_folder_p, '*')).select { |e|
        File.directory?(e)
      }
    end
    new_folders_p
  end

  def log_info(message)
    DCLogger.log.info(self.class.name) {
      @current_folder.path + ' >>> ' + message
    }
  end

  def log_error(message)
    DCLogger.log.error(self.class.name) {
      @current_folder.path + ' >>> ' + message
    }
  end
end
