module Chemotion
  class V1PublicAPI < Grape::API
    resource :public do

      namespace :affiliations do
        desc "Return all countries available"
        get "countries" do
          ISO3166::Country.all_translated
        end

        desc "Return all current organizations"
        get "organizations" do
          Affiliation.pluck("DISTINCT organization")
        end

        desc "Return all current departments"
        get "departments" do
          Affiliation.pluck("DISTINCT department")
        end

        desc "Return all current groups"
        get "groups" do
          Affiliation.pluck("DISTINCT affiliations.group")
        end
      end

    end
  end
end
