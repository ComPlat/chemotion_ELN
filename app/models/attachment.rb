# == Schema Information
#
# Table name: attachments
#
#  id              :integer          not null, primary key
#  attachable_id   :integer
#  filename        :string
#  identifier      :uuid
#  checksum        :string
#  storage         :string(20)       default("tmp")
#  created_by      :integer          not null
#  created_for     :integer
#  version         :integer          default(0)
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  content_type    :string
#  bucket          :string
#  key             :string(500)
#  thumb           :boolean          default(FALSE)
#  folder          :string
#  attachable_type :string
#  aasm_state      :string
#
# Indexes
#
#  index_attachments_on_attachable_type_and_attachable_id  (attachable_type,attachable_id)
#  index_attachments_on_identifier                         (identifier) UNIQUE
#


class Attachment < ActiveRecord::Base
  include AttachmentJcampAasm
  include AttachmentJcampProcess

  attr_accessor :file_data, :file_path, :thumb_path, :thumb_data, :duplicated, :transferred

  before_create :generate_key
  before_create :store_tmp_file_and_thumbnail, if: :new_upload
  before_create :add_checksum, if: :new_upload
  before_create :add_content_type

  before_save  :move_from_store, if: :store_changed, on: :update

  #reload to get identifier:uuid
  after_create :reload, on: :create
  after_create :store_file_and_thumbnail_for_dup, if: :duplicated

  after_destroy :delete_file_and_thumbnail

  belongs_to :attachable, polymorphic: true

  scope :where_research_plan, lambda { |c_id|
    where(attachable_id: c_id, attachable_type: 'ResearchPlan')
  }

  scope :where_container, lambda { |c_id|
    where(attachable_id: c_id, attachable_type: 'Container')
  }

  scope :where_report, lambda { |r_id|
    where(attachable_id: r_id, attachable_type: 'Report')
  }

  def copy(**args)
    d = self.dup
    d.identifier = nil
    d.duplicated = true
    d.update(args)
    d
  end

  def extname
    File.extname(self.filename.to_s)
  end

  def read_file
    store.read_file
  end

  def read_thumbnail
    store.read_thumb if self.thumb
  end

  def abs_path
    store.path
  end

  def abs_prev_path
    store.prev_path
  end

  def store
    Storage.new_store(self)
  end

  def old_store(old_store = self.storage_was)
    Storage.old_store(self,old_store)
  end

  def add_checksum
    store.add_checksum
  end

  def reset_checksum
    add_checksum
    update if checksum_changed?
  end

  def regenerate_thumbnail
    store.regenerate_thumbnail
    save! if self.thumb
  end

  def for_research_plan?
    attachable_type == 'ResearchPlan'
  end

  def for_container?
    attachable_type == 'Container'
  end

  def for_report?
    attachable_type == 'Report'
  end

  def research_plan_id
    for_research_plan? ? attachable_id : nil
  end

  def container_id
    for_container? ? attachable_id : nil
  end

  def report_id
    for_report? ? attachable_id : nil
  end

  def research_plan
    for_research_plan? ? attachable : nil
  end

  def container
    for_container? ? attachable : nil
  end

  def report
    for_report? ? attachable : nil
  end

  def update_research_plan!(c_id)
    update!(attachable_id: c_id, attachable_type: 'ResearchPlan')
  end

  def update_report!(r_id)
    update!(attachable_id: r_id, attachable_type: 'Report')
  end

  def rewrite_file_data!
    return unless file_data.present?
    store.destroy
    store.store_file
    self
  end

  def add_content_type
    return unless self.content_type.present?
    self.content_type = begin
                          MimeMagic.by_path(filename)&.type
                        rescue
                          nil
                        end
  end

  private

  def generate_key
    #unless self.key #&& self.key.match(
    #  /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
    #)
    self.key = SecureRandom.uuid unless self.key
  end

  def new_upload
    self.storage == 'tmp'
  end

  def store_changed
    #!new_record? && storage_changed?
    !self.duplicated && storage_changed?
  end

  def store_tmp_file_and_thumbnail
    stored = store.store_file
    self.thumb = store.store_thumb if stored
    stored
  end

  def store_file_and_thumbnail_for_dup
    #TODO have copy function inside store
    self.duplicated = nil
    if store.respond_to?(:path)
      self.file_path = store.path
    else
      self.file_data = store.read_file
    end
    if store.respond_to?(:thumb_path)
      self.thumb_path = store.thumb_path
    else
      self.thumb_data = store.read_thumb
    end
    stored = store.store_file
    self.thumb = store.store_thumb if stored
    self.save if stored
    stored
  end

  def transferred?
    self.transferred || false
  end

  def delete_file_and_thumbnail
    store.destroy
  end

  def move_from_store(from_store = self.storage_was)
    old_store.move_to_store(self.storage)
  end
end
