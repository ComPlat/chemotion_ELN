class Container < ActiveRecord::Base
  belongs_to :element, :polymorphic => true
  has_many :attachments
  has_ancestry

  #accepts_nested_attributes_for :container
  scope :ordered, -> { order("name ASC") }


  def analyses
    if self.children
      analyses = self.children.where(container_type: "analyses").first

      return analyses.children.where(container_type: "analysis") if analyses
    end

    return []
  end
end
