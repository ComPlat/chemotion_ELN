class Filecollector
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
    use_sftp ? search_for = 'filewatchersftp' : search_for = 'filewatcherlocal'
    Device.all.select { |e|
      e.profile.data && e.profile.data['method'] == search_for
    }
  end

  def inspect_folder(device)
    directory = device.profile.data['method_params']['dir']
    new_files(directory).each do |new_file_p|
      @current_file = DatacollectorFile.new(new_file_p, @sftp)
      error = CollectorError.find_by error_code: CollectorHelper.hash(
        @current_file.path,
        @sftp
      )
      begin
        stored = false
        if @current_file.recipient
          unless error
            @current_file.collect_from(device)
            log_info 'Stored!'
            stored = true
          end
          @current_file.delete
          log_info 'Status 200'
        else # Recipient unknown
          @current_file.delete
          log_info 'Recipient unknown. File deleted!'
        end
      rescue => e
        if stored
          CollectorHelper.write_error(
            CollectorHelper.hash(@current_file.path, @sftp)
          )
        end
        log_error e.backtrace.join('\n')
      end
    end
  end

  def new_files(monitored_folder_p)
    if @sftp
      new_files_p = @sftp.dir.glob(monitored_folder_p, '*').reject(
        &:directory?
      )
      new_files_p.map! do |f|
        File.join(monitored_folder_p, f.name)
      end
    else
      new_files_p = Dir.glob(File.join(monitored_folder_p, '*')).reject { |e|
        File.directory?(e)
      }
    end
    new_files_p.delete_if do |f|
      f.end_with?('.filepart', '.part')
    end
    new_files_p
  end

  def log_info(message)
    DCLogger.log.info(self.class.name) {
      @current_file.path + ' >>> ' + message
    }
  end

  def log_error(message)
    DCLogger.log.error(self.class.name) {
      @current_file.path + ' >>> ' + message
    }
  end
end
