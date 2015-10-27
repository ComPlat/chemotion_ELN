class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable

  has_many :collections
  has_many :samples, through: :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  validates_presence_of :first_name, :last_name, allow_blank: false

  def owns_collections?(collections)
    collections.pluck(:user_id).uniq == [id]
  end

  def owns_unshared_collections?(collections)
    owns_collections?(collections) && collections.pluck(:is_shared).none?
  end

  def name
    "#{first_name} #{last_name}"
  end

  def initials
    "#{first_name[0].capitalize}#{last_name[0].capitalize}"
  end

end
