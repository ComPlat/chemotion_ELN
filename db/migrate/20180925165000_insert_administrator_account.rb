class InsertAdministratorAccount < ActiveRecord::Migration
 def change
   attributes = {
     email: "eln-admin@kit.edu",
     first_name: "ELN",
     last_name: "Admin",
     password: "PleaseChangeYourPassword",
     name_abbreviation: "ADM",
     type: "Admin"
   }
  User.create!(attributes)
 end
end
