# Update a user profile of Element-tab-layout 
# due to renaming the Literature Tab to "References"
class UpdateUserProfile2 < ActiveRecord::Migration[5.2]
  def change
    old = 'literature' 
    alt = 'reference'
    new = 'references'   
    Profile.find_each do |profile|
      update_profile = false
      profile_json = profile.data
      next unless profile_json
      %w[layout_detail_sample layout_detail_reaction layout_detail_research_plan].each do |layout|
        if profile_json.dig(layout, old).present?
          profile_json[layout][new] = profile_json[layout].delete(old)
          update_profile = true
        end
        if profile_json.dig(layout, alt).present?
          profile_json[layout][new] = profile_json[layout].delete(alt)
          update_profile = true
        end
      end
      update_profile && profile.update_columns(data: profile_json)
    rescue JSON::ParserError, TypeError
      Rails.logger.info("Issue encountered while updating profile #{profile.id}")
    end
    Profile.reset_column_information
  end
end
