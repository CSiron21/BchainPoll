// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    struct Poll {
        string title;
        string[] options;
        bool exists;
        mapping(address => bool) hasVoted;
        mapping(uint256 => uint256) voteCounts;
    }

    mapping(uint256 => Poll) public polls;
    uint256 public pollCount;

    event PollCreated(uint256 pollId, string title, string[] options);
    event Voted(uint256 pollId, address voter, uint256 option);

    function createPoll(
        string memory _title,
        string[] memory _options
    ) public returns (uint256) {
        require(_options.length >= 2, "At least two options are required");

        uint256 pollId = pollCount++;
        Poll storage newPoll = polls[pollId];
        
        newPoll.title = _title;
        newPoll.options = _options;
        newPoll.exists = true;

        emit PollCreated(pollId, _title, _options);
        return pollId;
    }

    function vote(uint256 _pollId, uint256 _optionIndex) public {
        require(polls[_pollId].exists, "Poll does not exist");
        require(!polls[_pollId].hasVoted[msg.sender], "Already voted");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option");

        polls[_pollId].hasVoted[msg.sender] = true;
        polls[_pollId].voteCounts[_optionIndex]++;

        emit Voted(_pollId, msg.sender, _optionIndex);
    }

    function getPollDetails(uint256 _pollId) public view returns (
        string memory title,
        string[] memory options,
        bool exists
    ) {
        require(polls[_pollId].exists, "Poll does not exist");
        Poll storage poll = polls[_pollId];
        return (
            poll.title,
            poll.options,
            poll.exists
        );
    }

    function getVoteCount(uint256 _pollId, uint256 _optionIndex) public view returns (uint256) {
        require(polls[_pollId].exists, "Poll does not exist");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option");
        return polls[_pollId].voteCounts[_optionIndex];
    }

    function hasVoted(uint256 _pollId, address _voter) public view returns (bool) {
        require(polls[_pollId].exists, "Poll does not exist");
        return polls[_pollId].hasVoted[_voter];
    }
} 