package com.okteto.vote.events;

public class VoteEvent {

    private final String voterId;
    private final String vote;

    public VoteEvent(String voterId, String vote) {
        this.voterId = voterId;
        this.vote = vote;
    }

    public String getVoterId() {
        return voterId;
    }

    public String getVote() {
        return vote;
    }
}
