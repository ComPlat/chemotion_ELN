# frozen_string_literal: true

# == Schema Information
#
# Table name: containers
#
#  id                 :integer          not null, primary key
#  ancestry           :string
#  containable_type   :string
#  container_type     :string
#  deleted_at         :datetime
#  description        :text
#  extended_metadata  :hstore
#  name               :string
#  plain_text_content :text
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  containable_id     :integer
#  parent_id          :integer
#
# Indexes
#
#  index_containers_on_containable  (containable_type,containable_id)
#  index_containers_on_parent_id    (parent_id) WHERE (deleted_at IS NULL)
#
require 'rails_helper'

RSpec.describe Container, type: :model do
  pending "add some examples to (or delete) #{__FILE__}"
end
