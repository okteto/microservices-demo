package com.okteto.vote.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.okteto.vote.events.VoteEvent;

@Component
public class KafkaVoteEventListener {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final Logger logger = LoggerFactory.getLogger(KafkaVoteEventListener.class);
    private static final String KAFKA_TOPIC = "votes";

    public KafkaVoteEventListener(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @EventListener
    public void handleVoteEvent(VoteEvent event) {
        String voter = event.getVoterId();
        String vote = event.getVote();
        logger.info("Publishing vote event to Kafka: voter={}, vote={}", voter, vote);
        kafkaTemplate.send(KAFKA_TOPIC, voter, vote);
    }
}
