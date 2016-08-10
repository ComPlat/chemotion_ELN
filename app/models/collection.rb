class Collection < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :user
  has_ancestry

  has_many :collections_samples
  has_many :collections_reactions
  has_many :collections_wellplates
  has_many :collections_screens

  has_many :samples, through: :collections_samples, dependent: :destroy
  has_many :reactions, through: :collections_reactions, dependent: :destroy
  has_many :wellplates, through: :collections_wellplates, dependent: :destroy
  has_many :screens, through: :collections_screens, dependent: :destroy

  has_many :shared_collections_users,  foreign_key: :collection_id, class_name: 'SyncCollectionsUser'
  has_many :shared_users, through: :shared_collections_users, source: :user
  
  # A collection is locked if it is not allowed to rename or rearrange it
  scope :unlocked, -> { where(is_locked: false) }
  scope :locked, -> { where(is_locked: true) }

  # A collection is for_publication if it has the 'chemotion.net' label. In this collection
  # are elements which maybe shared on chemotion.net
  scope :for_publication, -> { where(label: 'chemotion.net') }

  scope :ordered, -> { order("position ASC") }
  scope :unshared, -> { where(is_shared: false) }
  scope :shared, ->(user_id) { where('shared_by_id = ? AND is_shared = ?', user_id, true) }
  scope :remote, ->(user_id) { where('is_shared = ? AND NOT shared_by_id = ?', true, user_id) }
  scope :belongs_to_or_shared_by, ->(user_id, with_group = false) do
    if with_group && !with_group.empty?
      where("user_id = ? OR shared_by_id = ? OR (user_id IN (?) AND is_locked = false)",
        user_id, user_id, with_group)
    else
      where("user_id = ? OR shared_by_id = ?", user_id, user_id)
    end
  end

  default_scope { ordered }

  def self.get_all_collection_for_user(user_id)
    where(user_id: user_id, label: 'All').first
  end

  def self.bulk_update(user_id, collection_attributes, deleted_ids)
    ActiveRecord::Base.transaction do
      update_or_create(user_id, collection_attributes)
      update_parent_child_associations(collection_attributes)
      deleted_ids.each do |id|
        c = Collection.find_by(id: id)
        c.destroy if c
      end
    end
  end

  private

  def self.update_or_create(user_id, collection_attributes, position=0)
    return unless collection_attributes

    collection_attributes.each do |attr|
      position += 1
      if(attr['isNew'])
        collection = create({label: attr['label'], user_id: user_id, position: position})
        # Replace fake id by real id
        attr['id'] = collection.id
      else
        collection = find(attr['id']).update({label: attr['label'], position: position})
      end
      update_or_create(user_id, attr['children'], position + 1)
    end
  end

  def self.update_parent_child_associations(collection_attributes, grand_parent=nil)
    return unless collection_attributes

    collection_attributes.each do |attr|
      parent = Collection.find(attr['id'])

      # collection is a new root collection
      unless(grand_parent)
        parent.update(parent: nil)
      end

      if(attr['children'])
        attr['children'].each do |attr_child|
          child = Collection.find(attr_child['id'])
          child.update(parent: parent)
        end
      end

      update_parent_child_associations(attr['children'], parent)
    end
  end
end
