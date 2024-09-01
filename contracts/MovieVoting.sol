import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MovieVoting is ReentrancyGuard {
    enum VotingState { NotStarted, Ongoing, Finished }
    
    struct Movie {
        string name;
        uint voteCount;
    }
    
    struct Voting {
        address creator;
        uint endTime;
        VotingState state;
        Movie[] movies;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint => Voting) public votings;
    uint public votingCount;
    
    event VotingCreated(uint indexed votingId, address indexed creator, uint endTime);
    event VoteCast(uint indexed votingId, address indexed voter, string movie);
    event VotingFinished(uint indexed votingId, string winner);

    error VotingNotStarted(uint votingId);
    error VotingAlreadyFinished(uint votingId);
    error NotEligibleToVote(uint votingId);
    error MovieNotFound(uint votingId, string movie);
    error VotingExpired(uint votingId);

    modifier onlyCreator(uint _votingId) {
        require(msg.sender == votings[_votingId].creator, "Not the creator");
        _;
    }
    
    modifier inState(uint _votingId, VotingState _state) {
        require(votings[_votingId].state == _state, "Invalid state");
        _;
    }

    receive() external payable {
        revert("Direct ETH transfers are not allowed");
    }

    fallback() external {
        revert("Fallback function not supported");
    }

    function createVoting(string[] memory _movies, uint _duration) public {
        require(_movies.length > 0, "No movies provided");

        Voting storage newVoting = votings[votingCount++];
        newVoting.creator = msg.sender;
        newVoting.endTime = block.timestamp + _duration;
        newVoting.state = VotingState.NotStarted;

        for (uint i = 0; i < _movies.length; i++) {
            newVoting.movies.push(Movie({ name: _movies[i], voteCount: 0 }));
        }

        emit VotingCreated(votingCount - 1, msg.sender, newVoting.endTime);
    }

    function startVoting(uint _votingId) public onlyCreator(_votingId) inState(_votingId, VotingState.NotStarted) {
        votings[_votingId].state = VotingState.Ongoing;
    }

    function getVoting(uint _votingId) public view returns (address, uint, VotingState, Movie[] memory) {
        Voting storage voting = votings[_votingId];
        return (voting.creator, voting.endTime, voting.state, voting.movies);
    }

    function hasUserVoted(uint _votingId, address _user) public view returns (bool) {
        return votings[_votingId].hasVoted[_user];
    }

    function vote(uint _votingId, string memory _movieName) public nonReentrant inState(_votingId, VotingState.Ongoing) {
        Voting storage voting = votings[_votingId];

        require(!voting.hasVoted[msg.sender], "Already voted");
        require(block.timestamp < voting.endTime, "Voting expired");


        bool found = false;

        Movie[] storage movies = voting.movies;
        for (uint i = 0; i < movies.length; i++) {
            if (keccak256(bytes(movies[i].name)) == keccak256(bytes(_movieName))) {
                movies[i].voteCount += 1;
                found = true;
                break;
            }
        }

        require(found, "Movie not found");
        voting.hasVoted[msg.sender] = true;

        emit VoteCast(_votingId, msg.sender, _movieName);
    }

    function finishVoting(uint _votingId) public nonReentrant onlyCreator(_votingId) inState(_votingId, VotingState.Ongoing) {
        require(block.timestamp >= votings[_votingId].endTime, "Voting still ongoing");

        Voting storage voting = votings[_votingId];
        voting.state = VotingState.Finished;

        string memory winner;
        uint maxVotes = 0;

        for (uint i = 0; i < voting.movies.length; i++) {
            if (voting.movies[i].voteCount > maxVotes) {
                maxVotes = voting.movies[i].voteCount;
                winner = voting.movies[i].name;
            }
        }

        emit VotingFinished(_votingId, winner);
    }
}
