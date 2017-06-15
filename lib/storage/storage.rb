class Storage
  attr_reader :attachment, :primary_store, :secundary_store
  class << self
    def new_store(attach)
      storage_klass(attach).new(attach)
    end

    def old_store(attach, old_store)
      constantize(old_store).new(attach)
    end

    def constantize(store)
      klass = store.camelize.constantize
      raise( TypeError, "#{store} class is not a Storage class") unless klass < Storage
      klass
    end

    def storage_klass(attach)
      store = attach.storage || 'tmp'
      constantize(store)
    end
  end

  def initialize(attach = Attachment.new)
    @store_configs = Rails.configuration.storage.stores
    @store_config = @store_configs[storage_sym]
    @primary_store = Rails.configuration.storage.primary_store
    @secondary_store = Rails.configuration.storage.secondary_store
    @attachment = attach
  end

  def move_to_store(store = primary_store)
    dest_store = self.class.constantize(store).new(attachment)
    attachment.file_data = read_file
    attachment.thumb_data = read_thumb if attachment.thumb
    file_stored = dest_store.store_file
    thumb_stored = dest_store.store_thumb if attachment.thumb
    #TODO checksum check
    file_removed = remove_file(true) if file_stored
    thumb_removed = remove_thumb_file(true) if thumb_stored
    attachment.storage = store
    file_removed
  end

  def storage_sym
    self.class.name.underscore.to_sym
  end

  def regenerate_thumbnail
    return if (fn = attachment.filename).blank? || (fe = File.extname(fn)).blank?
    tmp = Tempfile.new([fn, fe], encoding: 'ascii-8bit')
    tmp.write attachment.read_file
    attachment.thumb_path = Thumbnailer.create(tmp.path)
    if attachment.thumb_path && File.exist?(attachment.thumb_path)
      attachment.thumb = true
      store_thumb
    end
    tmp.close
    tmp.unlink
    FileUtils.rm(attachment.thumb_path, force: true) if attachment.thumb_path
    attachment.thumb_path = nil
  end
end
