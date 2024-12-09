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

    def self.new!(...)
      new(...).validate!
    end

    def self.entries(path, top_level: true, file_only: false, dir_only: false, sftp: nil)
      new(path, sftp: sftp).entries_as(top_level: top_level, file_only: file_only, dir_only: dir_only)
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
      true
    end

    # Delete the folder
    def delete_folder
      sftp? ? @sftp.remove_dir!(@path) : rmtree
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
    def typed_glob(filter, dir_only: false, file_only: false)
      return glob(filter).select(&:file?) if file_only
      return glob(filter).select(&:directory?) if dir_only

      glob(filter)
    end

    # Recursively count the number of files in the folder
    #
    # @return [Integer] The total number of files in the folder and its subfolders
    def file_count
      typed_glob('**/*', file_only: true).count
    end

    # Returns an array of CollectorFile file/folder from @path directory
    #
    # @option file_only [Boolean] if true, only files should be returned
    # @option dir_only [Boolean] if true, only directories are returned
    # @option top_level [Boolean] if true, only top_level entries are returned
    # @return [Array<CollectorFile>] The array of file/folders in the directory
    def entries_as(dir_only: false, file_only: false, top_level: true)
      filter = top_level ? '*' : '**/*'
      typed_glob(filter, file_only: file_only, dir_only: dir_only).map do |entry|
        self.class.new(
          build_relative_path(entry), path, sftp: @sftp, mtime: fetch_mtime(entry)
        )
      end
    end

    # Basename alias
    # @return [String] The name of the file
    def name
      basename
    end

    # Path alias
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

    # Get the mtime of the file from an item of entries
    #
    # @param entry [Pathname, Net::SFTP::Protocol::V01::Name] The entry to get the mtime from
    # @return [Integer] The mtime of the file
    def fetch_mtime(entry)
      case entry
      when Pathname
        entry.mtime
      when Net::SFTP::Protocol::V01::Name
        Time.zone.at(entry.attributes.mtime)
      end
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
