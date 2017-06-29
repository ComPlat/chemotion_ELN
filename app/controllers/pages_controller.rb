class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [:home]
  before_action :fetch_affiliations, only: [:affiliations, :update_affiliations]

  def heme; end

  def welcome; end

  def update_user
    @user = current_user
    @user.counters['reactions'] = params[:reactions_count].to_i
    @user.reaction_name_prefix = params[:reaction_name_prefix]
    if @user.save
      flash['success'] = 'User settings is successfully saved!'
      redirect_to root_path
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'user'
    end
  end

  def profiles
    current_user.has_profile
    @profile = current_user.profile
  end

  def update_profiles
    @profile = current_user.profile
    @profile.assign_attributes(profile_params)

    if @profile.save
      flash['success'] = 'Profile is successfully saved!'
      redirect_to root_path
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'profile'
    end
  end

  def groups
    @groups = (
      current_user.groups + current_user.administrated_accounts
                                        .where(type: 'Group')
    ).uniq.map do |g|
      GroupSerializer.new(g).serializable_hash.deep_stringify_keys
    end
    @new_group = Group.new
    @users = Person.all.map do |u|
      UserSerializer.new(u).serializable_hash.deep_stringify_keys
    end
  end

  def affiliations
    @new_aff = current_user.affiliations.build
    @new_aff.organization = Swot::school_name(current_user.email)
  end

  def create_affiliation
    @affiliation = current_user.affiliations.build(affiliation_params)
    if current_user.save!
      flash['success'] = 'New affiliation saved!'
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
    end
    redirect_to pages_affiliations_path
  end

  def update_affiliations
    cu_user_affiliations = current_user.user_affiliations
    affiliations_params[:affiliations].each do |affiliation|
      if affiliation.delete(:_destroy).blank?
        @affiliations.find(affiliation[:id]).update!(affiliation)
      else
        cu_user_affiliations.find_by(
          affiliation_id: affiliation[:id]
        ).destroy!
      end
    end
    redirect_to pages_affiliations_path
  end

  private

  def fetch_affiliations
    @affiliations = current_user.affiliations.order(
      to: :desc, from: :desc, created_at: :desc
    )
  end

  def affiliation_params
    params.require(:affiliation).permit(
      :id, :_destroy,
      :country, :organization, :department, :group,
      :from, :to, :from_month, :to_month
    )
  end

  def affiliations_params
    params.permit(
      :utf8, :_method, :authenticity_token, :commit,
      affiliations: [
        :id, :_destroy,
        # :country, :organization, :department, :group,
        :from, :to, :from_month, :to_month
      ]
    )
  end

  def profile_params
    params.require(:profile).permit(:show_external_name)
  end
end
