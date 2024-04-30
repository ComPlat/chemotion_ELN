# frozen_string_literal: true

require 'zip'

# Collector: folder inspection and collection
class Foldercollector < Fcollector
  FCOLL = 'folder'

  private

  def sleep_seconds(device)
    30 || (Rails.configuration.datacollectors.services &&
      (Rails.configuration.datacollectors.services.find do |e|
        e[:name] == device.profile.data['method']
      end || {})[:watcher_sleep])
  end

  def modification_time_diff(device, folder_p)
    time_now = Time.zone.now
    case device.profile.data['method']
    when 'folderwatcherlocal' then time_now - File.mtime(folder_p)
    when 'folderwatchersftp'
      time_now - (Time.zone.at @sftp.file.open(folder_p).stat.attributes[:mtime])
    else 30
    end
  end

  # rubocop:disable Metrics/CyclomaticComplexity
  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/MethodLength
  # rubocop:disable Metrics/PerceivedComplexity

  def inspect_folder(device)
    params = device.profile.data['method_params']
    user_level_selected = device.profile.data['method_params']['user_level_selected']

    if user_level_selected
      inspect_user_folders(device, params)
    else
      sleep_time = sleep_seconds(device).to_i
      new_folders(params['dir']).each do |new_folder_p| # rubocop:disable Metrics/BlockLength
        if (params['number_of_files'].blank? || (params['number_of_files']).to_i.zero?) &&
           modification_time_diff(device, new_folder_p) < 30
          sleep sleep_time
        end

        @current_collector = DatacollectorFolder.new(new_folder_p, @sftp)
        @current_collector.files = list_files
        error = CollectorError.find_by error_code: CollectorHelper.hash(
          @current_collector.path,
          @sftp,
        )
        begin
          stored = false
          if @current_collector.recipient
            if params['number_of_files'].present? && params['number_of_files'].to_i != 0 &&
               @current_collector.files.length != params['number_of_files'].to_i
              log_info("Wrong number of files! >>> #{device.info}")
              next
            end
            unless error
              @current_collector.collect(device)
              log_info("Stored! >>> #{device.info}")
              stored = true
            end
            @current_collector.delete
            log_info("Status 200 >>> #{device.info}")
          else # Recipient unknown
            @current_collector.delete
            log_info("Recipient unknown. Folder deleted! >>> #{device.info}")
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

  # rubocop:enable Metrics/CyclomaticComplexity
  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/MethodLength
  # rubocop:enable Metrics/PerceivedComplexity

  def list_files
    if @sftp
      all_files = @sftp.dir.glob(@current_collector.path, '**/*').reject(
        &:directory?
      )
      all_files.map!(&:name)
    else
      all_files = Dir.entries(@current_collector.path).reject do |e|
        File.directory?(File.join(@current_collector.path, e))
      end
    end
    all_files.delete_if do |f|
      f.end_with?('..', '.', '.filepart', '.part')
    end
    all_files
  end

  def inspect_user_folders(device, params)
    sleep_time = sleep_seconds(device).to_i
    new_folders(params['dir']).each do |new_folder_p|
      recipient_abbr = new_folder_p.split('/').last.split('-').first
      recipient = User.try_find_by_name_abbreviation recipient_abbr

      if recipient
        new_folders(new_folder_p).each do |new_folder|
          if (params['number_of_files'].blank? || (params['number_of_files']).to_i.zero?) &&
             modification_time_diff(device, new_folder) < 30
            sleep sleep_time
          end

          @current_collector = DatacollectorFolder.new(new_folder, @sftp, recipient_abbr)
          @current_collector.files = list_files
          error = CollectorError.find_by error_code: CollectorHelper.hash(
            @current_collector.path,
            @sftp,
          )
          begin
            stored = false

            if params['number_of_files'].present? && params['number_of_files'].to_i != 0 &&
               @current_collector.files.length != params['number_of_files'].to_i
              log_info("Wrong number of files! >>> #{device.info}")
              next
            end

            unless error
              @current_collector.collect(device)
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
end
