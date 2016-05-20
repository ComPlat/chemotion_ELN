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

  private
  def profile_param
    params.require(:profile).permit(:show_external_name)
  end
end
