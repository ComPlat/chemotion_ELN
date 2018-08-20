require 'rails_helper'

RSpec.describe PagesController do
  #login_user
  let(:user)    { create(:person) }
  let (:g1) {create(:group)}
  let (:g2) {create(:group)}
  let(:json_options) {
    {
      only: [:id],
      methods: [:name, :initials]
    }
  }
  before do
    sign__in(user)
  end
end
