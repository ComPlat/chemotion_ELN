# TODO Welcoming logged in user; maybe removed later on
class PagesController < ApplicationController
  def welcome
  end

  def profiles
    current_user.has_profile
    @profile = current_user.profile
  end

  def update_profiles
    @profile = current_user.profile
    @profile.assign_attributes(profile_param)

    if @profile.save
      flash["success"] = "Profile is successfully saved!"
      redirect_to root_path
    else
      flash.now["danger"] = "Not saved! Please check input fields."
      render "profile"
    end
  end

  def groups
    @groups = (current_user.groups+current_user.administrated_accounts.where(type: 'Group')).uniq.map{|g| GroupSerializer.new(g).serializable_hash.deep_stringify_keys}
    @new_group = Group.new
    @users = Person.all.map{|u| UserSerializer.new(u).serializable_hash.deep_stringify_keys }
  end


  private
  def profile_param
    params.require(:profile).permit(:show_external_name)
  end
end
