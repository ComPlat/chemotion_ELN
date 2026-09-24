# frozen_string_literal: true

# == Schema Information
#
# Table name: text_templates
#
#  id         :integer          not null, primary key
#  data       :jsonb
#  deleted_at :datetime
#  name       :string
#  type       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer          not null
#
# Indexes
#
#  index_personal_text_template        (user_id,name) UNIQUE WHERE ((type)::text = 'PersonalTextTemplate'::text)
#  index_predefined_template           (name) UNIQUE WHERE ((type)::text = 'PredefinedTextTemplate'::text)
#  index_text_templates_on_deleted_at  (deleted_at)
#  index_text_templates_on_user_id     (user_id)
#
require 'rails_helper'

# Presence and per-user uniqueness of +name+ are covered in spec/models/text_template_spec.rb.
RSpec.describe PersonalTextTemplate do
  let(:user) { create(:person) }

  it 'is a TextTemplate stored with its STI type' do
    template = create(:personal_text_template, user: user)

    expect(TextTemplate.find(template.id)).to be_a(described_class)
  end

  describe 'name uniqueness' do
    it 'ignores other template types with the same name' do
      create(:sample_text_template, user: user, name: 'shared name')

      expect(build(:personal_text_template, user: user, name: 'shared name')).to be_valid
    end
  end
end
