# == Schema Information
#
# Table name: containers
#
#  id                :integer          not null, primary key
#  ancestry          :string
#  containable_id    :integer
#  containable_type  :string
#  name              :string
#  container_type    :string
#  description       :text
#  extended_metadata :hstore
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  parent_id         :integer
#
# Indexes
#
#  index_containers_on_containable  (containable_type,containable_id)
#

class Container < ActiveRecord::Base
  include ElementCodes
  belongs_to :containable, polymorphic: true
  has_many :attachments, as: :attachable
  # TODO: dependent destroy for attachments should be implemented when attachment get paranoidized instead of this DJ
  before_destroy :delete_attachment
  has_closure_tree

  scope :analyses_for_root, ->(root_id) {
    where(container_type: 'analysis').joins(
      "inner join container_hierarchies ch on ch.generations = 2 and ch.ancestor_id = #{root_id} and ch.descendant_id = containers.id "
    )
  }

  def analyses
    Container.analyses_for_root(self.id)
  end

  def root_element
    self.root.containable
  end

  def self.create_root_container(**args)
    root_con = Container.create(name: 'root', container_type: 'root', **args)
    root_con.children.create(container_type: 'analyses')
    root_con
  end

  private

  def delete_attachment
    if Rails.env.production?
      attachments.each { |attachment|
        attachment.delay(run_at: 96.hours.from_now, queue: 'attachment_deletion').destroy!
      }
    else
      attachments.each(&:destroy!)
    end
  end
end
