const strategies = {
  'like-classic-mode': require('./like-classic-mode')['LikeClassicMode'],
  'follow-classic-mode': require('./follow-classic-mode')['FollowClassicMode'],
  'unfollow-classic-mode': require('./unfollow-classic-mode')['UnfollowClassicMode']
};


export default strategies;
