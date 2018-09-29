import * as sinon from 'sinon';
import * as chai from 'chai';
import { StorageService } from '../src/services/storage.service';
import { HttpService } from '../src/services/http.service';
import { Instabot } from '../src/lib';

const expect = chai.expect;
const storageService = new StorageService();
const httpService = new HttpService();
let bot: Instabot;

describe('Instabot', () => {
  const likeId = '3547143';
  const followerId = '75632543';
  const unfollowId = '324523';
  const dislikeId = '03495263';


  beforeEach('Setting up the storage data', () => {
    bot = new Instabot(httpService, storageService, {
      username: 'test',
      password: 'test',
      config: { isTesting: true },
    });

    storageService.addLike(likeId);
    storageService.disLiked(dislikeId);

    storageService.addFollower(followerId);
    storageService.unFollowed(unfollowId);

  });

  afterEach('Resetting storage data', () => {
    storageService.wipeData();
  });

  describe('#collectPreviousData()', () => {
    it('should collect all data already made today', () => {
      const expectedVals = [
        bot['followCountCurrentDay'] + 1,
        bot['likesCountCurrentDay'] + 1,
        bot['unfollowCountCurrentDay'] + 1,
        bot['dislikesCountCurrentDay'] + 1,
      ];

      bot['collectPreviousData']();
      expect(bot['followCountCurrentDay']).to.be.equal(expectedVals[0]);
      expect(bot['likesCountCurrentDay']).to.be.equal(expectedVals[1]);
      expect(bot['unfollowCountCurrentDay']).to.be.equal(expectedVals[2]);
      expect(bot['dislikesCountCurrentDay']).to.be.equal(expectedVals[3]);
    });
  });


  describe('#',()=>{
    it('should be inside ', ()=>{
      expect(bot['shouldBotSleep']).to.be.true;
    })
  })

  describe('#registerRoutine()', () => {
    it('should register a given routine', () => {
      const routineName = 'whooooFunction';
      const routine = () => {
        return 'success';
      };
      bot['registerRoutine'](routineName, routine);
      expect(bot['registeredRoutines']).haveOwnProperty(routineName);
      expect(bot['registeredRoutines'][routineName][0]).to.be.equal(routine);
      expect(bot['registeredRoutines'][routineName][0]).to.not.be.equal(() => {
        return 'something';
      });
      expect(bot['registeredRoutines'][routineName][0]()).to.be.equal(
        'success',
      );
      expect(bot['registeredRoutines'][routineName][0]()).to.not.be.equal(
        'anyotherval',
      );
    });
  });

  describe('#restartRoutines()', () => {
    it('should restart all registered routines', done => {
      //bot['clearRoutines']();
      const routineNames = ['whateverFunction', 'anotherOne'];
      const routineSpies = [sinon.spy(), sinon.spy()];
      //const routineSpies = [()=>{console.log('CALLED 0')}, ()=>{console.log('CALLED 1')}];
      for (let i = 0; i < routineNames.length; i++) {

        bot['registerRoutine'](routineNames[i], routineSpies[i]);
      }

      bot['restartRoutines']()
        .then(() => {
          routineSpies.forEach(routineSpy => {
            expect(routineSpy.calledOnce).to.be.true;
            expect(routineSpy.calledTwice).to.be.false;
          });
          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });
});
