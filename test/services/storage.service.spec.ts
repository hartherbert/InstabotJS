// import * as sinon from 'sinon';
import * as chai from 'chai';

import { StorageService } from '../../src/services/storage.service';

//const assert = chai.assert;
const expect = chai.expect;

const storageService = new StorageService();

describe('Storage Service uncategorized Methods', ()=>{

  beforeEach('Setting up the storage data', () => {
    storageService.addFollower('1');
    storageService.addFollower('10');
    storageService.addFollower('101');
    storageService.addFollower('1010');
  });

  afterEach('Resetting storage data', () => {
    storageService.wipeData();
  });


  /**
   * @link StorageService.setWaitTimeBeforeDelete
   * */
  it('should set the wait time before delete in seconds', () => {
    storageService['setWaitTimeBeforeDelete'](50); //setting minutes
    expect(storageService['waitTimeBeforeDeleteData']).be.equal(50 * 60);
  });

  /**
   * @link StorageService.wipeData
   * */
  it('should reset whole database', () => {
    storageService.wipeData();
    expect(storageService.getLikesLength()).to.be.an('number').and.be.equal(0);
    expect(storageService.getDisLikesLength()).to.be.an('number').and.be.equal(0);
    expect(storageService.getFollowersLength()).to.be.an('number').and.be.equal(0);
    expect(storageService.getUnFollowsLength()).to.be.an('number').and.be.equal(0);
  });

  /**
   * @link StorageService.cleanUp
   * */
  it('should clean all outdated data saved in the database', ()=>{
    storageService['database']
      .set(storageService['dislikesPath'], {
        '345905345': Date.now(),
        '458305953': new Date(Date.now() - 30 * 1000).getTime(), // + 30 seconds
        '384595398': new Date(Date.now() - 90 * 1000).getTime(), // + 90 seconds
      })
      .write();
    storageService['database']
      .set(storageService['unfollowsPath'], {
        '34590348905': Date.now(),
        '45830958903': new Date(Date.now() - 30 * 1000).getTime(), // + 30 seconds
        '38459398908': new Date(Date.now() - 90 * 1000).getTime(), // + 90 seconds
      })
      .write();

    // declare data as outdated if older than 1 minute
    storageService['setWaitTimeBeforeDelete'](1);
    // only two record of each should stay
    storageService.cleanUp();

    expect(storageService.getDisLikesLength()).be.equal(2);
    expect(storageService.getUnFollowsLength()).be.equal(2);


  })



});

describe('Storage Service Like/Dislike Tests', () => {
  const likeId: string = '23457235802395023';

  beforeEach('Setting up the storage data', () => {
    storageService.addLike(likeId);
  });

  afterEach('Resetting storage data', () => {
    storageService.wipeData();
  });

  /**
   * @link StorageService.addLike
   * */
  it('should add a new like to database', () => {
    expect(storageService.hasLike('3495834')).to.be.false;
    storageService.addLike('3495834');
    expect(storageService.hasLike('3495834')).to.be.true;
  });

  /**
   * @link StorageService.addDisLiked
   * */
  it('should add a new dislike to database', () => {
    storageService.addLike('3495834');
    expect(storageService.hasDisLike('3495834')).to.be.false;
    storageService['addDisLiked']('3495834');
    expect(storageService.hasDisLike('3495834')).to.be.true;
  });

  /**
   * @link StorageService.hasLike
   * */
  it('checks if posts already has been liked', () => {
    expect(storageService.hasLike(likeId)).be.true;
  });

  /**
   * @link StorageService.getLikesLength
   * */
  it('should return the length of the actual saved likes in the database', () => {
    storageService.addLike('48375984343'); // 2
    storageService.addLike('34583485347'); // 3
    storageService.addLike('83459345345'); // 4
    storageService.addLike('83459345345'); // still 4, same number as above
    expect(storageService.getLikesLength()).to.be.an('number');
    expect(storageService.getLikesLength()).to.be.equal(4);
  });

  /**
   * @link StorageService.hasDisLike
   * */
  it('checks if posts already has been disliked', () => {
    expect(storageService.hasDisLike(likeId)).be.false;
    storageService.disLiked(likeId);
    expect(storageService.hasDisLike(likeId)).be.true;
  });

  /**
   * @link StorageService.getDisLikesLength
   * */
  it('should return the length of the actual saved dislikes in the database', () => {
    storageService.addLike('48375984343');
    storageService.addLike('34583485347');
    storageService.addLike('83459345345');

    storageService.disLiked('48375984343'); // 1
    storageService.disLiked('34583485347'); // 2
    storageService.disLiked('83459345345'); // 3
    storageService.disLiked('83459345345'); // still 3

    expect(storageService.getDisLikesLength()).to.be.an('number');
    expect(storageService.getDisLikesLength()).to.be.equal(3);
  });

  /**
   * @link StorageService.getDislikeableLength
   * */
  it('should return a count of posts that can be disliked', () => {
    storageService['database']
      .set(storageService['likesPath'], {
        '34590345': Date.now(),
        '45830953': new Date(Date.now() - 30 * 1000).getTime(), // + 30 seconds
        '38457937': new Date(Date.now() - 50 * 1000).getTime(), // + 60 seconds
        '38459398': new Date(Date.now() - 90 * 1000).getTime(), // + 90 seconds
      })
      .write();
    expect(storageService.getDislikeableLength(60)).to.be.an('number');
    expect(storageService.getDislikeableLength(60)).be.equal(1);
  });

  /**
   * @link StorageService.getLikes
   * */
  it('should return all saved liked posts in the database', () => {
    expect(storageService.getLikes())
      .to.be.an('object')
      .and.haveOwnProperty(likeId);
  });

  /**
   * @link StorageService.getDisLikes
   * */
  it('should return all saved dislikes posts in the database', () => {
    storageService.disLiked(likeId);
    expect(storageService.getDisLikes())
      .to.be.an('object')
      .and.haveOwnProperty(likeId);
  });

  /**
   * @link StorageService.canLike
   * */
  it('should return if postId is likeable', () => {
    expect(storageService.canLike(likeId)).to.be.false;
    expect(storageService.canLike('likableId')).to.be.true;
  });

  /**
   * @link StorageService.getDislikeable
   * */
  it('should return all dislikeable posts at the moment', () => {
    storageService['database']
      .set(storageService['likesPath'], {
        '34590345': Date.now(),
        '45830953': new Date(Date.now() - 30 * 1000).getTime(), // + 30 seconds
        '38457937': new Date(Date.now() - 50 * 1000).getTime(), // + 50 seconds
        '38459398': new Date(Date.now() - 90 * 1000).getTime(), // + 90 seconds
      })
      .write();
    expect(storageService.getDislikeable(45))
      .to.be.an('object')
      .and.keys('38457937', '38459398');
  });

  /**
   * @link StorageService.disLiked
   * */
  it('should remove like and add dislike', () => {
    expect(storageService.hasLike(likeId)).to.be.true;
    storageService.disLiked(likeId);
    expect(storageService.hasLike(likeId)).to.be.false;
    expect(storageService.hasDisLike(likeId)).to.be.true;
  });

  /**
   * @link StorageService.removeLike
   * */
  it('should only remove one like', () => {
    storageService.addLike('1');
    storageService.addLike('2');
    storageService.addLike('3');
    expect(storageService.hasLike('1')).to.be.true;
    storageService['removeLike']('1');
    expect(storageService.hasLike('1')).to.be.false;
    expect(storageService.hasLike('2')).to.be.true;
    expect(storageService.hasLike('3')).to.be.true;
    expect(storageService.hasDisLike('1')).to.be.false;
  });

  /**
   * @link StorageService.removeDisLike
   * */
  it('should only remove one dislike', () => {
    storageService.disLiked('1');
    storageService.disLiked('2');
    storageService.disLiked('3');
    expect(storageService.hasDisLike('1')).be.true;
    storageService['removeDisLike']('1');
    expect(storageService.hasDisLike('1')).be.false;
    expect(storageService.hasDisLike('2')).be.true;
    expect(storageService.hasDisLike('3')).be.true;
    expect(storageService.hasLike('1')).be.false;
  });


});

describe('Storage Service Follow/Unfollow Tests', () => {
  const followerId: string = '32487958347258937';

  beforeEach('Setting up the storage data', () => {
    storageService.addFollower(followerId);
  });

  afterEach('Resetting storage data', () => {
    storageService.wipeData();
  });


  /**
   * @link StorageService.hasFollower
   * */
  it('checks if follower already has been followed', () => {
    expect(storageService.hasFollower('followerId')).to.be.false;
    storageService.addFollower('followerId');
    expect(storageService.hasFollower('followerId')).to.be.true;
  });

  /**
   * @link StorageService.hasUnFollowed
   * */
  it('checks if follower already has been unfollowed', () => {
    expect(storageService.hasUnFollowed('followerId')).to.be.false;
    storageService.unFollowed('followerId');
    expect(storageService.hasUnFollowed('followerId')).to.be.true;
  });

  /**
   * @link StorageService.getFollowersLength
   * */
  it('should return saved followers length inside database', () => {
    expect(storageService.getFollowersLength()).to.equal(1);
    storageService.addFollower('theFollower123');
    expect(storageService.getFollowersLength()).to.equal(2);
  });

  /**
   * @link StorageService.getUnFollowsLength
   * */
  it('should return saved unfollowed length inside database', () => {
    expect(storageService.getUnFollowsLength()).to.equal(0);
    storageService.unFollowed('firstFollower');
    expect(storageService.getUnFollowsLength()).to.equal(1);
    storageService.unFollowed('theFollower123');
    expect(storageService.getUnFollowsLength()).to.equal(2);
  });

  /**
   * @link StorageService.getUnfollowableLength
   * */
  it('should return a count of unfollowable users', () => {
    storageService['database']
      .set(storageService['followerPath'], {
        '34590345': Date.now(),
        '45830953': new Date(Date.now() - 30 * 1000).getTime(), // + 30 seconds
        '38457937': new Date(Date.now() - 50 * 1000).getTime(), // + 60 seconds
        '38459398': new Date(Date.now() - 90 * 1000).getTime(), // + 90 seconds
      })
      .write();
    expect(storageService.getUnfollowableLength(60)).to.be.an('number');
    expect(storageService.getUnfollowableLength(60)).be.equal(1);
  });

  /**
   * @link StorageService.getFollowers
   * */
  it('should return all saved followers in the database', () => {
    expect(storageService.getFollowers())
      .to.be.an('object')
      .and.haveOwnProperty(followerId);
  });

  /**
   * @link StorageService.getUnfollowed
   * */
  it('should return all saved unfollowed in the database', () => {
    storageService.unFollowed('aCrazyDude');
    expect(storageService.getUnfollowed())
      .to.be.an('object')
      .and.haveOwnProperty('aCrazyDude');
  });

  /**
   * @link StorageService.canFollow
   * */
  it('should return if user can be followed', () => {
    expect(storageService.canFollow(followerId)).to.be.false;
    expect(storageService.canFollow('f299403')).to.be.true;
  });

  /**
   * @link StorageService.getUnfollowable
   * */
  it('should return all unfollowable users at the moment', () => {
    storageService['database']
      .set(storageService['followerPath'], {
        '34590345': Date.now(),
        '45830953': new Date(Date.now() - 30 * 1000).getTime(), // + 30 seconds
        '38457937': new Date(Date.now() - 50 * 1000).getTime(), // + 50 seconds
        '38459398': new Date(Date.now() - 90 * 1000).getTime(), // + 90 seconds
      })
      .write();
    expect(storageService.getUnfollowable(45))
      .to.be.an('object')
      .and.keys('38457937', '38459398');
  });

  /**
   * @link StorageService.unFollowed
   * */
  it('should remove like and add dislike', () => {
    expect(storageService.hasFollower(followerId)).to.be.true;
    storageService.unFollowed(followerId);
    expect(storageService.hasFollower(followerId)).to.be.false;
    expect(storageService.hasUnFollowed(followerId)).to.be.true;
  });

  /**
   * @link StorageService.removeFollower
   * */
  it('should remove a follower from database', () => {
    expect(storageService.hasFollower(followerId)).to.be.true;
    storageService['removeFollower'](followerId);
    expect(storageService.hasFollower(followerId)).to.be.false;
  });

  /**
   * @link StorageService.removeUnfollowed
   * */
  it('should remove a unfollowed from database', () => {
    expect(storageService.hasUnFollowed(followerId)).to.be.false;
    storageService.unFollowed(followerId);
    expect(storageService.hasUnFollowed(followerId)).to.be.true;
    storageService['removeUnfollowed'](followerId);
    expect(storageService.hasFollower(followerId)).to.be.false;
  });

  /**
   * @link StorageService.addFollower
   * */
  it('should add a follower to the database', () => {
    expect(storageService.hasFollower('fofo')).to.be.false;
    storageService.addFollower('fofo');
    expect(storageService.hasFollower('fofo')).to.be.true;
  });

  /**
   * @link StorageService.addUnfollowed
   * */
  it('should add a unfollowed to the database', () => {
    expect(storageService.hasUnFollowed('uouo')).to.be.false;
    storageService['addUnfollowed']('uouo');
    expect(storageService.hasUnFollowed('uouo')).to.be.true;
  });
});
