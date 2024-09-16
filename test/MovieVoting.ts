import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('MovieVoting', function () {
  async function deployMovieVotingFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const MovieVoting = await ethers.getContractFactory('MovieVoting');
    const movieVoting = await MovieVoting.deploy();

    return { movieVoting, owner, addr1, addr2, addr3 };
  }

  describe('Deployment', function () {
    it('Should deploy the contract', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      expect(await movieVoting.votingCount()).to.equal(0);
    });

    it('Should deploy the contract and initialize votingCount', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      expect(await movieVoting.votingCount()).to.equal(0);
    });
  });

  describe('Creating a voting', function () {
    it('Should create a new voting', async function () {
      const { movieVoting, owner } = await deployMovieVotingFixture();
      const movies = ['Movie1', 'Movie2', 'Movie3'];
      const duration = 3600;

      await expect(movieVoting.createVoting(movies, duration))
        .to.emit(movieVoting, 'VotingCreated')
        .withArgs(0, owner.address, (await time.latest()) + duration);

      expect(await movieVoting.votingCount()).to.equal(1);
    });

    it('Should revert if no movies are provided', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await expect(movieVoting.createVoting([], 3600)).to.be.revertedWith(
        'No movies provided'
      );
    });

    it('Should return correct voting details when movies are provided', async function () {
      const { movieVoting, owner } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);

      const [creator, endTime, state, movies] = await movieVoting.getVoting(0);

      expect(creator).to.equal(owner.address);
      expect(typeof endTime).to.equal('bigint');
      expect(state).to.equal(0);
      expect(movies.length).to.equal(2);
    });

    it('Should revert if no movies are provided', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await expect(movieVoting.createVoting([], 3600)).to.be.revertedWith(
        'No movies provided'
      );
    });

    it('Should revert if createVoting is called with an empty array of movies', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await expect(movieVoting.createVoting([], 3600)).to.be.revertedWith(
        'No movies provided'
      );
    });

    it('Should create a voting correctly and return correct details', async function () {
      const { movieVoting, owner } = await deployMovieVotingFixture();
      const movies = ['Movie1', 'Movie2'];
      const duration = 3600;
      await movieVoting.createVoting(movies, duration);
      const [creator, endTime, state, moviesArray] =
        await movieVoting.getVoting(0);
      expect(creator).to.equal(owner.address);
      expect(endTime).to.be.gt(
        (await ethers.provider.getBlock('latest'))?.timestamp
      );
      expect(state).to.equal(0);
      expect(moviesArray.length).to.equal(2);
    });
  });

  describe('Starting a voting', function () {
    it('Should start a voting', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      const [, , state] = await movieVoting.getVoting(0);
      expect(state).to.equal(1);
    });

    it('Should correctly start a voting and update state', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1'], 3600);
      await movieVoting.startVoting(0);
      const [, , state] = await movieVoting.getVoting(0);
      expect(state).to.equal(1);
    });

    it('Should revert if a non-creator tries to start voting', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1'], 3600);
      await expect(
        movieVoting.connect(addr1).startVoting(0)
      ).to.be.revertedWith('Not the creator');
    });
  });

  describe('Voting', function () {
    it('Should allow a user to vote', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      await expect(movieVoting.connect(addr1).vote(0, 'Movie1'))
        .to.emit(movieVoting, 'VoteCast')
        .withArgs(0, addr1.address, 'Movie1');

      expect(await movieVoting.hasUserVoted(0, addr1.address)).to.be.true;
    });

    it('Should revert if voting has not started', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await expect(
        movieVoting.connect(addr1).vote(0, 'Movie1')
      ).to.be.revertedWith('Invalid state');
    });

    it('Should revert if user has already voted', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);
      await movieVoting.connect(addr1).vote(0, 'Movie1');
      await expect(movieVoting.connect(addr1).vote(0, 'Movie2'))
        .to.be.revertedWithCustomError(movieVoting, 'NotEligibleToVote')
        .withArgs(0);
    });

    it('Should revert if movie is not found', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);
      await expect(movieVoting.connect(addr1).vote(0, 'Movie3'))
        .to.be.revertedWithCustomError(movieVoting, 'MovieNotFound')
        .withArgs(0, 'Movie3');
    });

    it('Should revert if the movie name is an empty string', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      await expect(movieVoting.connect(addr1).vote(0, '')).to.be.revertedWith(
        'Movie name cannot be empty'
      );
    });

    it('Should not allow multiple votes from the same user', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      await movieVoting.connect(addr1).vote(0, 'Movie1');

      await expect(movieVoting.connect(addr1).vote(0, 'Movie2'))
        .to.be.revertedWithCustomError(movieVoting, 'NotEligibleToVote')
        .withArgs(0);
    });
  });

  describe('Finishing a voting', function () {
    it('Should finish a voting and declare the winner', async function () {
      const { movieVoting, addr1, addr2 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      await movieVoting.connect(addr1).vote(0, 'Movie1');
      await movieVoting.connect(addr2).vote(0, 'Movie1');

      await time.increase(3601);

      await expect(movieVoting.finishVoting(0))
        .to.emit(movieVoting, 'VotingFinished')
        .withArgs(0, 'Movie1');

      const [, , state] = await movieVoting.getVoting(0);
      expect(state).to.equal(2);
    });

    it('Should revert if voting is not ongoing', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await expect(movieVoting.finishVoting(0)).to.be.revertedWith(
        'Invalid state'
      );
    });

    it('Should revert if voting time has not expired', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);
      await expect(movieVoting.finishVoting(0)).to.be.revertedWith(
        'Voting still ongoing'
      );
    });

    it('Should revert when trying to finish voting before the voting period ends', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      await expect(movieVoting.finishVoting(0)).to.be.revertedWith(
        'Voting still ongoing'
      );
    });
  });

  describe('Error handling', function () {
    it('Should revert when trying to vote for a non-existent voting', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await expect(
        movieVoting.connect(addr1).vote(999, 'Movie1')
      ).to.be.revertedWith('Invalid state');
    });

    it('Should revert when trying to vote after voting has finished', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);
      await time.increase(3601);
      await movieVoting.finishVoting(0);

      await expect(
        movieVoting.connect(addr1).vote(0, 'Movie1')
      ).to.be.revertedWith('Invalid state');
    });

    it('Should revert when trying to vote after voting has expired but not finished', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);
      await time.increase(3601);

      await expect(movieVoting.connect(addr1).vote(0, 'Movie1'))
        .to.be.revertedWithCustomError(movieVoting, 'VotingExpired')
        .withArgs(0);
    });

    it('Should handle tie-breaking when finishing a voting', async function () {
      const { movieVoting, owner, addr1, addr2, addr3 } =
        await deployMovieVotingFixture();

      await movieVoting.createVoting(['Movie1', 'Movie2', 'Movie3'], 3600);
      await movieVoting.startVoting(0);

      await movieVoting.connect(addr1).vote(0, 'Movie1');
      await movieVoting.connect(addr2).vote(0, 'Movie2');
      await movieVoting.connect(addr3).vote(0, 'Movie3');

      await time.increase(3601);

      const tx = await movieVoting.connect(owner).finishVoting(0);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      const logs = receipt.logs;

      const votingFinishedEvent = logs.find(
        (log) =>
          movieVoting.interface.parseLog(log as any)?.name === 'VotingFinished'
      );

      expect(votingFinishedEvent).to.not.be.undefined;

      if (votingFinishedEvent) {
        const parsedLog = movieVoting.interface.parseLog(
          votingFinishedEvent as any
        );
        const winner = parsedLog?.args[1];
        expect(winner).to.be.a('string');

        const possibleWinners = ['Movie1', 'Movie2', 'Movie3'];
        expect(possibleWinners).to.include(winner);
      } else {
        throw new Error('VotingFinished event not found');
      }
    });
  });

  describe('Error Handling for Non-existent Voting', function () {
    it('Should revert when trying to finish a non-existent voting', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await expect(movieVoting.finishVoting(999)).to.be.revertedWith(
        'Not the creator'
      );
    });
  });

  describe('Edge cases', function () {
    it('Should revert on direct ETH transfer', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await expect(
        addr1.sendTransaction({
          to: await movieVoting.getAddress(),
          value: ethers.parseEther('1.0'),
        })
      ).to.be.revertedWith('Direct ETH transfers are not allowed');
    });

    it('Should revert on empty data call (receive function)', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();

      const tx = {
        to: await movieVoting.getAddress(),
        data: '0x',
      };

      await expect(addr1.sendTransaction(tx)).to.be.revertedWith(
        'Direct ETH transfers are not allowed'
      );
    });

    it('Should revert on fallback function call with data', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();

      const tx = {
        to: await movieVoting.getAddress(),
        data: '0x1234567890abcdef',
      };

      await expect(addr1.sendTransaction(tx)).to.be.revertedWith(
        'Fallback function not supported'
      );
    });
  });
});
