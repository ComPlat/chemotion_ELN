class UpdateUserProfile < ActiveRecord::Migration[5.2]
  def change
    Profile.find_each do |profile|
      profile_json = profile.data
      next if profile_json.dig('layout_detail_reaction', 'references').nil?

      profile_json['layout_detail_reaction']['literature'] = profile_json['layout_detail_reaction']['references']
      profile_json['layout_detail_reaction'].delete('references')
      profile.update_columns(data: profile_json)
    rescue JSON::ParserError, TypeError
      Rails.logger.info("Issue encountered while updating profile #{profile.id}")
    end
    Profile.reset_column_information
  end
end
