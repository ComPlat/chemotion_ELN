require 'rails_helper'

RSpec.describe PagesController do
  let(:user)    { create(:person) }
  let (:group) {create(:group,users: [user])}
  before do
    #allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    allow(request.env['warden']).to receive(:authenticate!).and_return(user)
    allow(controller).to receive(:current_user).and_return(user)
  end

  describe "GET groups" do


    it "assigns @groups" do

      get :groups
      expect(assigns(:groups)).to match_array([group])
    end

    it "renders the groups template" do
      get :groups
      expect(response).to render_template("groups")
    end
  end

end
