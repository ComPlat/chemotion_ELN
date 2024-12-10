# frozen_string_literal: true

require 'fileutils'
require 'net/sftp'

module Datacollector
  # Class file utility wrapper for handling file/folder operations
  #   whether the source is on local fs or remote through sftp
  #
  #
  # @!attribute [r] pathname
  #   @return [Pathname] The path of the file/folder as a Pathname object
  # @!attribute [r] path
  #   @return [String] The path of the file/folder as a string
  # @!attribute [r] relative_path
  #  @return [String] The relative path input of the file/folder as a string
  # @!attribute [r] root_path
  #  @return [String] The root directory path input as a string
  #
  class CollectorFile
    attr_reader :pathname, :path, :relative_path, :root_path

    ONETWODOTS = %w[. ..].freeze

    def self.new!(...)
      new(...).validate!
    end

    def self.entries(path, top_level: true, file_only: false, dir_only: false, sftp: nil)
      return new(path, sftp: sftp).entries_sftp(top_level: top_level, file_only: file_only, dir_only: dir_only) if sftp

      new(path).entries_local(top_level: top_level, file_only: file_only, dir_only: dir_only)
    end

    # Initialize a new CollectorFile object
    #
    # @param relative_path [String] The relative path of the file or directory structure
    # @param root_path [String] The root directory path of the file is relative from
    # @option sftp [SFTPClient] nil if the file/folder is on local fs or an SFTPClient if the file is on an SFTP server
    # @option mtime [Time] nil if the attribute should be fetched from the file system,
    #   otherwise initialized with the given value
    # @return [FStruct] The FStruct object
    def initialize(relative_path, root_path = nil, sftp: nil, mtime: nil)
      @root_path = root_path.to_s
      @relative_path = relative_path.to_s
      @sftp = sftp
      @mtime = mtime
      @pathname = Pathname.new(@root_path).join(@relative_path)
      @path = @pathname.to_s
    end

    def validate!
      raise ArgumentError, 'not a valid SFTP Client' if @sftp.present? && !sftp?
      raise ArgumentError, "The combined path '#{path}' does not exist." unless exist?

      self
    end

    # FileUtils like methods

    def delete
      delete!
    rescue StandardError
      false
    end

    def delete!
      file? ? delete_file : delete_folder
      true
    end

    # Delete a file
    def delete_file
      sftp? ? @sftp.remove_file!(@path) : @pathname.delete
      !exist?
    end

    # Delete the folder
    def delete_folder
      sftp? ? @sftp.remove_dir!(@path) : rmtree
      !exist?
    end

    # @return [Time] The mtime of the file
    def mtime
      @mtime ||= sftp? ? Time.zone.at(@sftp.mtime(@path)) : @pathname.mtime
    end

    # Returns an array of file/folder in the @path directory
    #
    # @param filter [string] The glob filter to apply
    # @option file_only [Boolean] if true, only files should be returned
    # @option dir_only [Boolean] if true, only directories are returned
    # @return [Array<Pathname>, Array<Net::SFTP::Protocol::V01::Name>] The array of file/folders in the directory
    def entries_glob(filter, dir_only: false, file_only: false)
      time_setter = sftp? ? :mtime_sftp : :mtime_local
      case [dir_only, file_only]
      when [true, false]
        glob(filter).select(&:directory?)
      when [false, true]
        glob(filter).select(&:file?)
      else
        glob(filter)
      end.map do |entry|
        self.class.new(
          build_relative_path(entry), path, sftp: @sftp, mtime: send(time_setter, entry)
        )
      end
    end

    # Recursively count the number of files in the folder
    #
    # @return [Integer] The total number of files in the folder and its subfolders
    def file_count
      glob('**/*').select(&:file?).count # rubocop:disable Performance/Count
    end

    # Returns an array of CollectorFile file/folder from @path directory
    #
    # @option file_only [Boolean] if true, only files should be returned
    # @option dir_only [Boolean] if true, only directories are returned
    # @option top_level [Boolean] if true, only top_level entries are returned
    # @return [Array<CollectorFile>] The array of file/folders in the directory
    def entries_as(dir_only: false, file_only: false, top_level: true)
      return entries_sftp(dir_only: dir_only, file_only: file_only, top_level: top_level) if sftp?

      entries_local(dir_only: dir_only, file_only: file_only, top_level: top_level)
    end

    # @see entries_as
    def entries_local(dir_only: false, file_only: false, top_level: true)
      if top_level
        return entries_local_top_level.select(&:directory?) if dir_only
        return entries_local_top_level.select(&:file?) if file_only

        return entries_local_top_level
      end

      entries_glob('**/*', file_only: file_only, dir_only: dir_only)
    end

    # @return [Array<CollectorFile>] The array of file/folders in the directory
    def entries_local_top_level
      entries.filter_map do |entry|
        next(nil) if ONETWODOTS.include?(entry.basename.to_s)

        self.class.new(entry.basename.to_s, path, mtime: mtime_local(pathname + entry))
      end
    end

    # @see entries_as
    def entries_sftp(dir_only: false, file_only: false, top_level: true)
      if top_level
        return entries_sftp_top_level.select(&:directory?) if dir_only
        return entries_sftp_top_level.select(&:file?) if file_only

        return entries_sftp_top_level
      end

      entries_glob('**/*', file_only: file_only, dir_only: dir_only)
    end

    # @return [Array<CollectorFile>] The array of file/folders in the directory
    def entries_sftp_top_level
      entries.filter_map do |entry|
        next(nil) if ONETWODOTS.include?(entry.name)

        self.class.new(entry.name, path, mtime: mtime_sftp(entry), sftp: @sftp)
      end
    end

    # Basename alias
    #
    # @return [String] The name of the file
    def name
      basename
    end

    # Path alias
    #
    # @return [String] The path of the File
    def to_s
      path
    end

    # Zip the folder and its content into a tmp file
    # @return [Tempfile] The zip file
    def to_zip
      return if file?

      tmp_zip = Tempfile.new
      options = { top_level: false, file_only: true }
      Dir.mktmpdir do |tmpdir|
        @sftp.download_directory!(@path, tmpdir) if sftp?
        ::Zip::File.open(tmp_zip.path, ::Zip::File::CREATE) do |zipfile|
          (sftp? ? CollectorFile.entries(tmpdir, **options) : entries_as(**options)).each do |entry|
            zipfile.add(entry.relative_path, entry.path)
          end
        end
      end
      tmp_zip.rewind
      tmp_zip
    end

    # @return [File, Tempfile] The file object
    def as_local_file
      return File.new(@pathname) unless sftp?

      tmpfile = Tempfile.new
      @sftp.download_file!(@path, tmpfile.path)
      tmpfile.rewind
      tmpfile
    end

    private

    # Get the mtime of the file from an item of entries (from Pathname or SFTP session)
    #
    # @param entry [Pathname, Net::SFTP::Protocol::V01::Name] The entry to get the mtime from
    # @return [Integer] The mtime of the file
    def fetch_mtime(entry)
      case entry
      when Pathname
        mtime_local(entry)
      when Net::SFTP::Protocol::V01::Name
        mtime_sfpt(entry)
      end
    end

    # Get the mtime of the file from an item of entries (from Pathname)
    #
    # @param entry [Pathname] The entry to get the mtime from
    # @return [Integer] The mtime of the file
    def mtime_local(entry)
      entry.mtime
    end

    # Get the mtime of the file from an item of sftp entries
    #
    # @param entry [Net::SFTP::Protocol::V01::Name] The entry to get the mtime from
    # @return [Integer] The mtime of the file
    def mtime_sftp(entry)
      Time.zone.at(entry.attributes.mtime)
    end

    # Build fstruct.relative_path an item of entries
    #
    # @param entry [Pathname, Net::SFTP::Protocol::V01::Name] The entry to get the relative_path of
    # @return [Pathname] The relative path of the file
    def build_relative_path(entry)
      case entry
      when Pathname
        entry.relative_path_from(@pathname).to_s
      when Net::SFTP::Protocol::V01::Name
        entry.name
      end
    end

    # Delegate methods to the sftp or pathname object
    #
    # @note the following methods are defined:
    #   :basename @return [String] The basename of the file/folder
    #   :dirname @return [String] The dirname of the file/folder
    #   :extname @return [String] The extension of the file
    #   :exist? @return [Boolean] True if the file/folder exists
    #   :file? @return [Boolean] True if the file is a file
    #   :directory? @return [Boolean] True if the file is a directory
    #   :to_s @return [String] The path of the file/folder
    def method_missing(method, *args, &block)
      case method
      when :basename, :dirname, :extname
        @pathname.send(method, *args, &block).to_s
      else
        sftp? ? @sftp.send(method, @path, *args, &block) : @pathname.send(method, *args, &block)
      end
    end

    def respond_to_missing?(method, include_private = false)
      if sftp?
        @sftp.respond_to?(method, include_private)
      else
        @pathname.respond_to?(method, include_private)
      end
    end

    # test sftp object
    # @return [Boolean] True if the sftp object is a Net::SFTP::Session
    def sftp?
      @sftp.is_a?(SFTPClient)
    end
  end
end
