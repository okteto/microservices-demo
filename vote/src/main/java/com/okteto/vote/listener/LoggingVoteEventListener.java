package com.okteto.vote.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.okteto.vote.events.VoteEvent;

@Component
public class LoggingVoteEventListener {

    private final Logger logger = LoggerFactory.getLogger(LoggingVoteEventListener.class);

    @EventListener
    public void onVoteEvent(VoteEvent event) {
        logger.info("VoteEvent received: voter={}, vote={}", event.getVoterId(), event.getVote());
    }
}
