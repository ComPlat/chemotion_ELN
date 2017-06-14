class Container < ActiveRecord::Base
  include ElementCodes
  belongs_to :containable, polymorphic: true
  has_many :attachments
  has_closure_tree

  def analyses
    if self.children
      analyses = self.children.where(container_type: 'analyses').first

      return analyses.children.where(container_type: 'analysis') if analyses
    end
    Container.none
  end

  def root_element
    self.root.containable
  end

  def self.create_root_container(**args)
    root_con = Container.create(name: 'root', container_type: 'root', **args)
    root_con.children.create(container_type: 'analyses')
    root_con
  end
end
