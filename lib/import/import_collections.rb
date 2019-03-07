require 'json'

module Import
  class ImportCollections

    def initialize(file_path, current_user_id)
      @file_path = file_path
      @current_user_id = current_user_id

      @directory = File.join(
        File.dirname(@file_path),
        File.basename(file_path, File.extname(file_path))
      )
      @data = nil
      @uuids = {}
      @attachments = []
    end

    def process
      extract
      read
      import
      self
    end

    def extract()
      # # make sure that no old directory exists
      # FileUtils.remove_dir(@directory) if File.directory?(@directory)

      destination = File.dirname(@file_path)
      Zip::File.open(@file_path) do |zip_file|
        zip_file.each do |f|
          fpath = File.join(destination, f.name)
          fdir = File.dirname(fpath)

          FileUtils.mkdir_p(fdir) unless File.directory?(fdir)
          zip_file.extract(f, fpath) unless File.exist?(fpath)
        end
      end

      # delete the zip file
      # File.delete(file_path) if File.exist?(file_path)
    end

    def read
      # open and read the data.json
      file_name = File.join(@directory, 'data.json')
      File.open(file_name) do |f|
        @data = JSON.parse(f.read())
      end
    end

    def import
      ActiveRecord::Base.transaction do
        @data.each do |item|
          puts item
        end
      end
    end

  end
end
