# frozen_string_literal: true

# Collector: file inspection and collection
class Filecollector < Fcollector
  FCOLL = 'file'

  private

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/MethodLength
  # rubocop:disable Metrics/PerceivedComplexity
  # rubocop:disable Metrics/BlockLength

  def inspect_folder(device)
    directory = device.datacollector_dir
    user_level_selected = device.datacollector_user_level_selected

    if user_level_selected
      inspect_user_folders(device, directory)
    else
      new_files(directory).each do |new_file_p| # rubocop:disable Metrics/BlockLength
        @current_collector = DatacollectorFile.new(new_file_p, @sftp)
        error = CollectorError.find_by error_code: CollectorHelper.hash(
          @current_collector.path,
          @sftp,
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
        rescue StandardError => e
          if stored
            CollectorHelper.write_error(
              CollectorHelper.hash(@current_collector.path, @sftp),
            )
          end
          log_error("#{e.message} >>> #{device.info}\n#{e.backtrace.join('\n')}")
        end
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
      new_files_p = Dir.glob(File.join(monitored_folder_p, '*')).reject do |e|
        File.directory?(e)
      end
    end
    new_files_p.delete_if do |f|
      f.end_with?('.filepart', '.part')
    end
    new_files_p
  end

  def inspect_user_folders(device, directory)
    new_folders(directory).each do |new_folder_p|
      recipient_abbr = new_folder_p.split('/').last.split('-').first
      recipient = User.try_find_by_name_abbreviation recipient_abbr

      if recipient
        new_files(new_folder_p).each do |new_file_p|
          @current_collector = DatacollectorFile.new(new_file_p, @sftp, recipient_abbr)
          error = CollectorError.find_by error_code: CollectorHelper.hash(
            @current_collector.path,
            @sftp,
          )
          begin
            stored = false

            unless error
              @current_collector.collect_from(device)
              log_info("Stored! >>> #{device.info}")
              stored = true
            end

            @current_collector.delete
            log_info("Status 200 >>> #{device.info}")
          rescue StandardError => e
            if stored
              CollectorHelper.write_error(
                CollectorHelper.hash(@current_collector.path, @sftp),
              )
            end
            log_error("#{e.message} >>> #{device.info}\n#{e.backtrace.join('\n')}")
          end
        end
      else # Recipient unknown
        log_info("Recipient unknown. >>> #{device.info} >>> #{recipient_abbr}")
      end
    end
  end

  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/MethodLength
  # rubocop:enable Metrics/PerceivedComplexity
  # rubocop:enable Metrics/BlockLength
end
