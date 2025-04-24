# == Schema Information
#
# Table name: container_hierarchies
#
#  ancestor_id   :integer          not null
#  descendant_id :integer          not null
#  generations   :integer          not null
#
# Indexes
#
#  container_anc_desc_udx  (ancestor_id,descendant_id,generations) UNIQUE
#  container_desc_idx      (descendant_id)
#
class ContainerHierarchy < ApplicationRecord
end
