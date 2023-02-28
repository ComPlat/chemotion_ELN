# frozen_string_literal: true

# Collector: file inspection and collection
class Filecollector < Fcollector
  FCOLL = 'file'

  private

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/MethodLength

  def inspect_folder(device)
    directory = device.profile.data['method_params']['dir']
    new_files(directory).each do |new_file_p| # rubocop:disable Metrics/BlockLength
      @current_collector = DatacollectorFile.new(new_file_p, @sftp)
      error = CollectorError.find_by error_code: CollectorHelper.hash(
        @current_collector.path,
        @sftp
      )
      begin
        stored = false
        if @current_collector.recipient
          unless error
            @current_collector.collect_from(device)
            log_info("Stored! >>> #{device.info}")
            stored = true
          end
          @current_collector.delete
          log_info("Status 200 >>> #{device.info}")
        else # Recipient unknown
          @current_collector.delete
          log_info("Recipient unknown. File deleted! >>> #{device.info}")
        end
      rescue => e
        if stored
          CollectorHelper.write_error(
            CollectorHelper.hash(@current_collector.path, @sftp)
          )
        end
        log_error("#{e.message} >>> #{device.info}\n#{e.backtrace.join('\n')}")
      end
    end
  end

  # rubocop:enable Metrics/AbcSize

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

  # rubocop:enable Metrics/MethodLength
end
