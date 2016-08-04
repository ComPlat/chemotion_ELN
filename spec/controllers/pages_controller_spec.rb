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

  describe "GET groups" do


    it "assigns @groups" do
      g1.users << user
      g1.save
      g2.admins << user
      g2.save
      get :groups
      groups=assigns(:groups).map{|g| g.select{|k| k.match(/id|name|initials/)}}
      expect(groups).to match_array([g1.as_json(json_options),g2.as_json(json_options)])
    end

    it "renders the groups template" do
      get :groups
      expect(response).to render_template("groups")
    end
  end

end
