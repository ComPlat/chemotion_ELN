require 'storage'
require 'local'

class Void < Storage
  attr_reader :data_folder

  def initialize(attach)
    super(attach)
    datafolder =  File.join(Rails.root,'tmp', Rails.env, 'void')
    FileUtils.mkdir_p(data_folder) unless Dir.exist?(data_folder)
  end

  def file_exist?
    false
  end

  def store_file
    true
  end

  def store_thumb
    true
  end

  def read_file
    'File not found'
  end

  def read_thumb
    true
  end

  def remove_file
    true
  end

  def remove_thumb_file
    true
  end

  def destroy
    true
  end

  def path
    data_folder
  end

  def thumb_path
    data_folder
  end

  def add_checksum
  end

  private

  def write_thumbnail
  end

  def write_file
  end

  def set_key
  end

  def set_bucket
  end

  def rm_file
  end

  def rm_thumb_file
  end

  def create_dirs
  end

  def create_thumb_dir
  end
end
