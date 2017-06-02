
class Attachment < ActiveRecord::Base
  belongs_to :container
  attr_accessor :file_data, :file_path, :thumb_path, :thumb_data

  #reload to get identifier:uuid
  before_create :add_checksum
  before_create :generate_key
  before_create :store_tmp_file_and_thumbnail

  after_create :reload, on: :create
  before_save  :move_from_store, if: :storage_changed?, on: :update

  after_destroy :delete_file_and_thumbnail

  def extname
    File.extname(self.filename.to_s)
  end

  def read_file
    store.read_file
  end

  def read_thumbnail
    store.read_thumb if self.thumb
  end

  def store
    Storage.new_store(self)
  end

  def old_store(old_store = self.storage_was)
    Storage.old_store(self,old_store)
  end

  private

  def add_checksum
    self.checksum = Digest::SHA256.hexdigest(self.file_data) if self.file_data
  end

  def generate_key
    #unless self.key #&& self.key.match(
    #  /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
    #)
    self.key = SecureRandom.uuid unless self.key
  end

  def store_tmp_file_and_thumbnail
    stored = store.store_file
    self.thumb = store.store_thumb if stored
    stored
  end

  def delete_file_and_thumbnail
    store.destroy
  end

  def move_from_store(from_store = self.storage_was)
    old_store.move_to_store(self.storage)
  end
end
