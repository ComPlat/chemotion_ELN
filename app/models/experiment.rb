class Experiment < ActiveRecord::Base
  belongs_to :device
  belongs_to :container
  belongs_to :experimentable, :polymorphic => true
end
