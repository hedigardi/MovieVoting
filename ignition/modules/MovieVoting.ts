import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
const MovieVotingModule = buildModule('MovieVotingModule', (m) => {
  const movieVoting = m.contract('MovieVoting', [], {});

  return { movieVoting };
});

export default MovieVotingModule;
