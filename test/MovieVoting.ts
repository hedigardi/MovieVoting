import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('MovieVoting', function () {
  async function deployMovieVotingFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const MovieVoting = await ethers.getContractFactory('MovieVoting');
    const movieVoting = await MovieVoting.deploy();

    return { movieVoting, owner, addr1, addr2 };
  }

  describe('Deployment', function () {
    it('Should deploy the contract', async function () {
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
  });

  describe('Starting a voting', function () {
    it('Should start a voting', async function () {
      const { movieVoting } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);

      const [, , state] = await movieVoting.getVoting(0);
      expect(state).to.equal(1);
    });

    it('Should revert if not the creator', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
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
      await expect(
        movieVoting.connect(addr1).vote(0, 'Movie2')
      ).to.be.revertedWith('Already voted');
    });

    it('Should revert if movie is not found', async function () {
      const { movieVoting, addr1 } = await deployMovieVotingFixture();
      await movieVoting.createVoting(['Movie1', 'Movie2'], 3600);
      await movieVoting.startVoting(0);
      await expect(
        movieVoting.connect(addr1).vote(0, 'Movie3')
      ).to.be.revertedWith('Movie not found');
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

      await expect(
        movieVoting.connect(addr1).vote(0, 'Movie1')
      ).to.be.revertedWith('Voting expired');
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
