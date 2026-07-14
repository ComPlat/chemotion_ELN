# frozen_string_literal: true

class PersonalTextTemplate < TextTemplate
  validates :name, presence: true, uniqueness: { scope: :user_id }
end
