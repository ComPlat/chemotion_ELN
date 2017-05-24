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
      raise( TypeError, "#{store} class is not a Storage class") if klass.superclass != Storage
      klass
    end

    def storage_klass(attach)
      store = attach.storage || 'tmp'
      constantize(store)
    end
  end

  def initialize(attach = Attachment.new)
    @store_configs = Rails.configuration.storage.stores
    @primary_store = Rails.configuration.storage.primary_store
    @secundary_store = Rails.configuration.storage.secundary_store
    @attachment = attach
  end

  def move_to_store(store = primary_store)
    dest_store = self.class.constantize(store).new(attachment)

    attachment.file_data = read_file
    attachment.thumb_data = read_thumb if attachment.thumb
    file_stored = dest_store.store_file
    thumb_stored = dest_store.store_thumb if attachment.thumb
    #TODO checksum check
    file_removed = remove_file if file_stored
    thumb_removed = remove_thumb_file if thumb_stored
    
    file_removed
  end

end
