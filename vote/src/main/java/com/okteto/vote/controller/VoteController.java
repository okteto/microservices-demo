package com.okteto.vote.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.concurrent.ListenableFuture;
import org.springframework.util.concurrent.ListenableFutureCallback;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.thymeleaf.util.StringUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.UUID;

@Controller
public class VoteController {
    private static final String OPTION_A_ENV_VAR = "OPTION_A";
    private static final String OPTION_B_ENV_VAR = "OPTION_B";
    private static final String KAFKA_TOPIC = "votes";

    private final Logger logger = LoggerFactory.getLogger(VoteController.class);

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @GetMapping("/")
    String index(@CookieValue(name = "voter_id", defaultValue = "") String voterId,
                 Model model,
                 HttpServletResponse response) {
        String voter = voterId;
        Vote v = new Vote();
        model.addAttribute("optionA", v.getOptionA());
        model.addAttribute("optionB", v.getOptionB());
        model.addAttribute("hostname", v.getHostname());
        model.addAttribute("vote", null);

        if (StringUtils.isEmpty(voter)) {
            voter = UUID.randomUUID().toString();
        }

        Cookie cookie = new Cookie("voter_id", voter);
        response.addCookie(cookie);

        return "index";
    }

    @PostMapping("/")
    String postForm(@CookieValue(name = "voter_id", defaultValue = "") String voterId,
                    @ModelAttribute Vote voteInput,
                    Model model,
                    HttpServletResponse response) {
        String voter = voterId;
        String vote = voteInput.getVote();
        Vote v = new Vote();
        model.addAttribute("optionA", v.getOptionA());
        model.addAttribute("optionB", v.getOptionB());
        model.addAttribute("hostname", v.getHostname());
        // We pass the vote received in the post request
        model.addAttribute("vote", vote);
        if (StringUtils.isEmpty(voter)) {
            voter = UUID.randomUUID().toString();
        }
        logger.info(String.format("vote received for '%s'!", vote));

        Cookie cookie = new Cookie("voter_id", voter);
        response.addCookie(cookie);

        ListenableFuture<SendResult<String, String>> future = kafkaTemplate.send(KAFKA_TOPIC, voter, vote);

        future.addCallback(new ListenableFutureCallback<SendResult<String, String>>() {
            @Override
            public void onSuccess(SendResult<String, String> result) {
                logger.info("Message [{}] delivered with offset {}",
                        vote,
                        result.getRecordMetadata().offset());
            }

            @Override
            public void onFailure(Throwable ex) {
                logger.warn("Unable to deliver message [{}]. {}",
                        vote,
                        ex.getMessage());
            }
        });

        return "index";
    }

    public static class Vote {
        private String optionA = "Cats";
        private String optionB = "Dogs";
        private String hostname = "unknown";
        private String vote;

        public String getOptionA() {
            String result = System.getenv(OPTION_A_ENV_VAR);
            return StringUtils.isEmpty(result) ? this.optionA : result;
        }

        public void setOptionA(String optionA) {
            this.optionA = optionA;
        }

        public String getOptionB() {
            String result = System.getenv(OPTION_B_ENV_VAR);
            return StringUtils.isEmpty(result) ? this.optionB : result;
        }

        public void setOptionB(String optionB) {
            this.optionB = optionB;
        }

        public String getHostname() {
            try {
                return InetAddress.getLocalHost().getHostName();
            } catch (UnknownHostException e) {
                return this.hostname;
            }
        }

        public void setHostname(String hostname) {
            this.hostname = hostname;
        }

        public String getVote() {
            return vote;
        }

        public void setVote(String vote) {
            this.vote = vote;
        }
    }
}
